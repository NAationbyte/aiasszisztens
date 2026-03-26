"""
AI Asszisztens — Universal Customer Service Bot Engine
Handles any business type with a simple JSON config.

Safety features:
1. Knowledge-base grounded (only answers from config data)
2. Strict topic restriction
3. Response validation
4. Human handoff for uncertain/sensitive topics
5. No hallucinated prices, contacts, or availability
"""
import json
import os
import re
from pathlib import Path
from typing import Optional, Dict, List
from dataclasses import dataclass
from datetime import datetime
import pytz


@dataclass
class BotResponse:
    message: str
    handoff: bool = False  # Should we notify the business owner?
    lead_data: Optional[Dict] = None  # Captured lead info
    confidence: float = 1.0


class BusinessBot:
    """Universal customer service bot powered by LLM + knowledge base."""
    
    def __init__(self, config_path: str):
        """Load business config from JSON file."""
        with open(config_path) as f:
            self.config = json.load(f)
        
        self.business = self.config["business"]
        self.services = self.config.get("services", [])
        self.faq = self.config.get("faq", [])
        self.lead_config = self.config.get("lead_capture", {})
        self.booking = self.config.get("booking", {})
        self.tone = self.config.get("tone", {})
        self.safety = self.config.get("safety", {})
        self.model_config = self.config.get("model", {})
        
        # Conversation memory per session
        self.conversations: Dict[str, List[Dict]] = {}
        
        # Build knowledge base text
        self.knowledge_base = self._build_knowledge_base()
        
        # Build system prompt
        self.system_prompt = self._build_system_prompt()
    
    def _build_knowledge_base(self) -> str:
        """Build a structured knowledge base string from config."""
        kb = []
        
        # Business info
        b = self.business
        kb.append(f"CÉG NEVE: {b['name']}")
        kb.append(f"IPARÁG: {b.get('industry', 'N/A')}")
        kb.append(f"LEÍRÁS: {b.get('description', 'N/A')}")
        if b.get('phone'):
            kb.append(f"TELEFON: {b['phone']}")
        if b.get('email'):
            kb.append(f"EMAIL: {b['email']}")
        if b.get('address'):
            kb.append(f"CÍM: {b['address']}")
        if b.get('website'):
            kb.append(f"WEBOLDAL: {b['website']}")
        
        # Opening hours
        hours = b.get('hours', {})
        if hours:
            days_hu = {
                'monday': 'Hétfő', 'tuesday': 'Kedd', 'wednesday': 'Szerda',
                'thursday': 'Csütörtök', 'friday': 'Péntek',
                'saturday': 'Szombat', 'sunday': 'Vasárnap'
            }
            kb.append("\nNYITVATARTÁS:")
            for day, label in days_hu.items():
                h = hours.get(day, 'N/A')
                kb.append(f"  {label}: {h}")
        
        # Services
        if self.services:
            kb.append("\nSZOLGÁLTATÁSOK:")
            for s in self.services:
                line = f"  - {s['name']}"
                if s.get('description'):
                    line += f": {s['description']}"
                if s.get('price_from') is not None:
                    if s.get('price_to'):
                        line += f" (Ár: {s['price_from']}-{s['price_to']} Ft)"
                    else:
                        line += f" (Ár: {s['price_from']} Ft-tól)"
                if s.get('price_note'):
                    line += f" [{s['price_note']}]"
                kb.append(line)
        
        # FAQ
        if self.faq:
            kb.append("\nGYAKORI KÉRDÉSEK:")
            for qa in self.faq:
                kb.append(f"  K: {qa['question']}")
                kb.append(f"  V: {qa['answer']}")
                kb.append("")
        
        return "\n".join(kb)
    
    def _build_system_prompt(self) -> str:
        """Build the system prompt with safety constraints."""
        
        biz_name = self.business['name']
        tone_style = self.tone.get('language_style', 'professional but warm')
        greeting = self.tone.get('greeting', 'Üdvözlöm! Miben segíthetek?')
        handoff_msg = self.tone.get('handoff_message', 'Kollégámnak továbbítom a kérdést.')
        off_topic = self.safety.get('off_topic_response', 'Ebben nem tudok segíteni.')
        
        blocked = ", ".join(self.safety.get('blocked_topics', []))
        never_make_up = ", ".join(self.safety.get('never_make_up', []))
        handoff_keywords = ", ".join(self.safety.get('always_handoff_keywords', []))
        
        languages = self.business.get('languages', ['hu'])
        lang_instruction = ""
        if 'hu' in languages and len(languages) == 1:
            lang_instruction = "MINDIG magyarul válaszolj."
        elif len(languages) > 1:
            lang_instruction = f"Válaszolj az ügyfél nyelvén. Támogatott nyelvek: {', '.join(languages)}."
        
        prompt = f"""Te a(z) {biz_name} ügyfélszolgálati asszisztense vagy.

STÍLUS: {tone_style}
{lang_instruction}

SZIGORÚ SZABÁLYOK — EZEKET SOHA NE SZEGD MEG:

1. CSAK az alábbi tudásbázis alapján válaszolj. Ha valami NINCS benne, mondd: "{handoff_msg}"
2. SOHA ne találj ki: {never_make_up}
3. SOHA ne beszélj ezekről: {blocked}
4. Ha az ügyfél ezeket a szavakat használja: [{handoff_keywords}] → azonnal mondd: "{handoff_msg}"
5. Ha nem vagy biztos egy válaszban → inkább add át kollégának: "{handoff_msg}"
6. Ha az ügyfél nem a cég szolgáltatásairól kérdez → "{off_topic.replace('{service_topic}', self.business.get('industry', 'szolgáltatásaink'))}"
7. Maximum {self.safety.get('max_response_length', 500)} karakter hosszú válaszokat adj.

LEAD GYŰJTÉS:
Ha az ügyfél érdeklődik, finoman kérd el:
- Nevét
- Telefonszámát
- Email címét (opcionális)
- Miben érdekelt pontosan

Ne kérdezz mindent egyszerre — természetes beszélgetés keretében gyűjtsd.

TUDÁSBÁZIS:
{self.knowledge_base}

---
Emlékezz: Te NEM egy általános AI vagy. Te a(z) {biz_name} asszisztense vagy, és KIZÁRÓLAG a fenti információk alapján válaszolsz.
"""
        return prompt
    
    def _check_handoff_keywords(self, message: str) -> bool:
        """Check if message contains keywords that require human handoff."""
        keywords = self.safety.get('always_handoff_keywords', [])
        message_lower = message.lower()
        return any(kw.lower() in message_lower for kw in keywords)
    
    def _extract_lead_data(self, message: str) -> Optional[Dict]:
        """Try to extract lead data from message."""
        lead = {}
        
        # Phone number patterns (Hungarian + international)
        phone_match = re.search(r'(?:\+?36|06)?[\s-]?(?:20|30|31|50|70)[\s-]?\d{3}[\s-]?\d{4}', message)
        if not phone_match:
            phone_match = re.search(r'\+?\d{10,12}', message)
        if phone_match:
            lead['phone'] = phone_match.group().strip()
        
        # Email
        email_match = re.search(r'[\w.+-]+@[\w-]+\.[\w.-]+', message)
        if email_match:
            lead['email'] = email_match.group()
        
        return lead if lead else None
    
    def _validate_response(self, response: str) -> str:
        """Validate and clean bot response before sending."""
        # Check max length
        max_len = self.safety.get('max_response_length', 500)
        if len(response) > max_len:
            # Truncate at last sentence boundary
            truncated = response[:max_len]
            last_period = max(truncated.rfind('.'), truncated.rfind('!'), truncated.rfind('?'))
            if last_period > max_len * 0.5:
                response = truncated[:last_period + 1]
        
        # Check for competitor mentions (basic check)
        # In production, this would be a more sophisticated filter
        
        return response
    
    def _is_business_open(self) -> bool:
        """Check if the business is currently open."""
        tz = pytz.timezone(self.business.get('timezone', 'Europe/Budapest'))
        now = datetime.now(tz)
        day_name = now.strftime('%A').lower()
        hours = self.business.get('hours', {}).get(day_name, 'closed')
        
        if hours.lower() == 'closed':
            return False
        
        try:
            open_time, close_time = hours.split('-')
            open_h, open_m = map(int, open_time.strip().split(':'))
            close_h, close_m = map(int, close_time.strip().split(':'))
            current_minutes = now.hour * 60 + now.minute
            open_minutes = open_h * 60 + open_m
            close_minutes = close_h * 60 + close_m
            return open_minutes <= current_minutes <= close_minutes
        except:
            return True  # Default to open if can't parse
    
    async def chat(self, session_id: str, user_message: str) -> BotResponse:
        """
        Process a user message and return a response.
        
        Args:
            session_id: Unique identifier for the conversation (e.g., phone number)
            user_message: The user's message
        
        Returns:
            BotResponse with message, handoff flag, and any lead data
        """
        
        # Initialize conversation history
        if session_id not in self.conversations:
            self.conversations[session_id] = []
        
        # Check for handoff keywords
        if self._check_handoff_keywords(user_message):
            handoff_msg = self.tone.get('handoff_message', 
                'Ezt a kérdést kollégámnak továbbítom.')
            return BotResponse(
                message=handoff_msg,
                handoff=True,
                confidence=1.0
            )
        
        # Extract any lead data
        lead_data = self._extract_lead_data(user_message)
        
        # Add to conversation history
        self.conversations[session_id].append({
            "role": "user",
            "content": user_message
        })
        
        # Keep last 10 messages for context
        recent_history = self.conversations[session_id][-10:]
        
        # Build messages for LLM
        messages = [
            {"role": "system", "content": self.system_prompt}
        ] + recent_history
        
        # Call LLM
        try:
            response_text = await self._call_llm(messages)
        except Exception as e:
            return BotResponse(
                message="Elnézést, technikai probléma merült fel. Kérem, próbálja újra, vagy hívjon minket közvetlenül.",
                handoff=True,
                confidence=0.0
            )
        
        # Validate response
        response_text = self._validate_response(response_text)
        
        # Save to history
        self.conversations[session_id].append({
            "role": "assistant",
            "content": response_text
        })
        
        return BotResponse(
            message=response_text,
            handoff=False,
            lead_data=lead_data,
            confidence=0.9
        )
    
    async def _call_llm(self, messages: List[Dict]) -> str:
        """Call the configured LLM provider."""
        provider = self.model_config.get('provider', 'openai')
        model = self.model_config.get('model', 'gpt-4o-mini')
        temperature = self.model_config.get('temperature', 0.3)
        max_tokens = self.model_config.get('max_tokens', 500)
        
        if provider == 'openai':
            return await self._call_openai(messages, model, temperature, max_tokens)
        elif provider == 'anthropic':
            return await self._call_anthropic(messages, model, temperature, max_tokens)
        else:
            raise ValueError(f"Unknown provider: {provider}")
    
    async def _call_openai(self, messages, model, temperature, max_tokens) -> str:
        """Call OpenAI API."""
        import openai
        client = openai.AsyncOpenAI(api_key=os.getenv('OPENAI_API_KEY'))
        
        response = await client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
        )
        return response.choices[0].message.content
    
    async def _call_anthropic(self, messages, model, temperature, max_tokens) -> str:
        """Call Anthropic API."""
        import anthropic
        client = anthropic.AsyncAnthropic(api_key=os.getenv('ANTHROPIC_API_KEY'))
        
        # Convert messages format (Anthropic uses different format)
        system = next((m['content'] for m in messages if m['role'] == 'system'), '')
        chat_messages = [m for m in messages if m['role'] != 'system']
        
        response = await client.messages.create(
            model=model,
            system=system,
            messages=chat_messages,
            temperature=temperature,
            max_tokens=max_tokens,
        )
        return response.content[0].text


def create_bot_from_onboarding(
    business_name: str,
    industry: str,
    description: str,
    phone: str,
    email: str = "",
    address: str = "",
    website: str = "",
    services: List[Dict] = None,
    faq: List[Dict] = None,
    hours: Dict = None,
    languages: List[str] = None,
    output_dir: str = "clients",
) -> str:
    """
    Create a new bot config from onboarding data.
    Returns path to the config file.
    
    This is what we call after a new client fills out the onboarding form.
    """
    
    # Load template
    template_path = Path(__file__).parent / "config_template.json"
    with open(template_path) as f:
        config = json.load(f)
    
    # Fill in business info
    config['business']['name'] = business_name
    config['business']['industry'] = industry
    config['business']['description'] = description
    config['business']['phone'] = phone
    config['business']['email'] = email
    config['business']['address'] = address
    config['business']['website'] = website
    
    if hours:
        config['business']['hours'] = hours
    if languages:
        config['business']['languages'] = languages
    
    if services:
        config['services'] = services
    if faq:
        config['faq'] = faq
    
    # Set notification targets
    config['lead_capture']['notification_email'] = email
    config['lead_capture']['notification_whatsapp'] = phone
    
    # Customize tone based on industry
    industry_tones = {
        'medical': 'formal and reassuring',
        'restaurant': 'friendly and enthusiastic',
        'legal': 'formal and precise',
        'beauty': 'warm and welcoming',
        'construction': 'professional and straightforward',
        'automotive': 'helpful and knowledgeable',
        'fitness': 'energetic and motivating',
        'real_estate': 'professional and trustworthy',
    }
    if industry.lower() in industry_tones:
        config['tone']['language_style'] = industry_tones[industry.lower()]
    
    # Save config
    safe_name = re.sub(r'[^a-zA-Z0-9_]', '_', business_name.lower())
    out_dir = Path(__file__).parent.parent / output_dir / safe_name
    out_dir.mkdir(parents=True, exist_ok=True)
    
    config_path = out_dir / "config.json"
    with open(config_path, 'w', encoding='utf-8') as f:
        json.dump(config, f, indent=2, ensure_ascii=False)
    
    print(f"✅ Bot config created: {config_path}")
    return str(config_path)


# ============ Example: Create Rodo bot ============

if __name__ == "__main__":
    # Example: onboarding a window company
    config_path = create_bot_from_onboarding(
        business_name="Rodo Nyílászáró",
        industry="construction",
        description="Nyílászáró forgalmazás és beépítés. Ablakok, ajtók, redőnyök, szúnyoghálók.",
        phone="+36207734132",
        email="rodoablak@gmail.com",
        website="https://rodo.hu",
        address="Budapest",
        services=[
            {
                "name": "Műanyag ablakok",
                "description": "Aluplast, Rehau, Gealan, Veka, Schüco profilok",
                "price_from": 45000,
                "price_to": 180000,
                "price_note": "mérettől és profiltól függően",
                "duration": ""
            },
            {
                "name": "Bejárati ajtók",
                "description": "Műanyag és alumínium bejárati ajtók",
                "price_from": 150000,
                "price_to": None,
                "price_note": "egyedi árajánlat alapján",
                "duration": ""
            },
            {
                "name": "Redőnyök",
                "description": "Műanyag és alumínium redőnyök, szúnyoghálók",
                "price_from": 25000,
                "price_to": None,
                "price_note": "mérettől függően",
                "duration": ""
            },
            {
                "name": "Beépítés",
                "description": "Professzionális beépítés garanciával",
                "price_from": None,
                "price_to": None,
                "price_note": "árajánlat tartalmazza",
                "duration": "1-3 nap"
            }
        ],
        faq=[
            {
                "question": "Mennyi idő alatt készül el a rendelés?",
                "answer": "A szállítási idő általában 2-4 hét a rendeléstől számítva, profiltól függően."
            },
            {
                "question": "Ingyenes a felmérés?",
                "answer": "Igen, a helyszíni felmérés teljesen ingyenes és kötelezettségmentes."
            },
            {
                "question": "Van garancia?",
                "answer": "Igen, termékeinkre 5 év gyártói garancia, a beépítésre 3 év garancia vonatkozik."
            },
            {
                "question": "Milyen fizetési lehetőségek vannak?",
                "answer": "Készpénz, banki átutalás, vagy akár részletfizetés is lehetséges."
            }
        ],
        hours={
            "monday": "08:00-17:00",
            "tuesday": "08:00-17:00",
            "wednesday": "08:00-17:00",
            "thursday": "08:00-17:00",
            "friday": "08:00-16:00",
            "saturday": "09:00-12:00",
            "sunday": "closed"
        },
        languages=["hu"],
    )
    
    print(f"\nConfig created at: {config_path}")
    print("\nTo test the bot:")
    print(f"  python3 -c \"")
    print(f"  from bot import BusinessBot")
    print(f"  import asyncio")
    print(f"  bot = BusinessBot('{config_path}')")
    print(f"  r = asyncio.run(bot.chat('test', 'Sziasztok, mennyi egy ablak?'))")
    print(f"  print(r.message)")
    print(f"  \"")
