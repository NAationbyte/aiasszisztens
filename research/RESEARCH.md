# AI Asszisztens — Research Notes
## 2026-03-25

---

## 1. WhatsApp Delivery: Official API vs Bridge

### Official WhatsApp Business API (Meta Cloud API)
- **Cost**: Free for first 1,000 service conversations/month, then ~$0.03-0.08/conversation (varies by country)
- **Hungary**: ~€0.0353/service conversation, ~€0.0745/marketing
- **US**: ~$0.025/service, ~$0.05/marketing  
- **Pros**: Official, no ban risk, green checkmark, message templates, 99.9% uptime
- **Cons**: Approval process (2-7 days), conversation-based pricing, 24h reply window
- **BSP options**: Direct (Meta Cloud API), Twilio, MessageBird, 360dialog
- **Best for us**: Meta Cloud API direct (no BSP markup) OR 360dialog (cheapest BSP)

### Bridge (what we use now with OpenClaw)
- **Cost**: $0 (just phone + internet)
- **Pros**: Free, instant setup, no approval needed
- **Cons**: Ban risk, one phone tied up, disconnects (we see this!), no green checkmark, not scalable
- **Verdict**: Fine for us personally, NOT for selling to clients

### **Decision: Use Official API for client bots**
- Start with Meta Cloud API direct
- 1,000 free conversations/month covers most small businesses
- ~$5-15/month for busy clients
- We absorb this cost in the monthly fee (massive margin anyway)

---

## 2. Best Model for Customer Service

### Requirements:
- Accurate responses from knowledge base
- Low hallucination rate
- Fast response (<3 seconds)
- Cheap enough for 95%+ margin at $49-199/month
- Good at Hungarian + English
- Good at following strict instructions

### Model Comparison (2026 pricing):

| Model | Input $/1M | Output $/1M | Quality | Speed | Hungarian |
|-------|-----------|-------------|---------|-------|-----------|
| GPT-4o-mini | $0.15 | $0.60 | Good | Fast | Good |
| GPT-5.4.5-mini | $0.20 | $0.80 | Very Good | Fast | Very Good |
| Claude Haiku 4.5 | $0.25 | $1.25 | Good | Fast | Good |
| Claude Sonnet 4 | $3.00 | $15.00 | Excellent | Medium | Excellent |
| Gemini 3.1 Flash | $0.075 | $0.30 | Good | Fastest | Good |
| Grok 3 Mini | $0.30 | $0.50 | Good | Fast | OK |

### Cost estimate per client per month:
- Average conversation: ~500 tokens in + 300 tokens out
- 100 conversations/month = 50K in + 30K out tokens
- **GPT-4o-mini**: $0.007 + $0.018 = **$0.03/month** (!)
- **Gemini Flash**: $0.004 + $0.009 = **$0.01/month** (!!)
- **Claude Sonnet**: $0.15 + $0.45 = **$0.60/month**
- Even heavy usage (1000 conv/mo): GPT-4o-mini = $0.30/month

### **Decision: GPT-4o-mini as default, Claude Sonnet as premium tier**
- Default: GPT-4o-mini (~$0.03-0.30/month) — 99.9%+ margin
- Premium: Claude Sonnet (~$0.60-6.00/month) — still 95%+ margin
- Gemini Flash as fallback (cheapest, good for simple Q&A)

---

## 3. Anti-Hallucination Strategy

### Layer 1: Knowledge Base Grounding (RAG)
- Every client gets a structured knowledge base (JSON)
- Contains: services, prices, FAQ, hours, contact info, policies
- Bot ALWAYS searches KB before answering
- If answer not in KB → hand off to human

### Layer 2: Strict System Prompt
```
You are a customer service assistant for [BUSINESS_NAME].
You ONLY answer questions based on the provided business information.
If a question is outside your knowledge, say: "Ezt a kérdést kollégáimnak továbbítom."
NEVER make up prices, availability, or contact details.
NEVER discuss topics unrelated to [BUSINESS_NAME]'s services.
```

### Layer 3: Response Validation
- Check if response mentions any price/number → verify against KB
- Check if response contains competitor names → block
- Check if response goes off-topic → redirect
- Confidence scoring (future): if model uncertainty high → handoff

### Layer 4: Human Handoff
- "Nem vagyok biztos" → instant notification to business owner
- Sensitive topics (complaints, legal) → always handoff
- After-hours complex inquiries → "Kollégám holnap felveszi Önnel a kapcsolatot"

---

## 4. Competitor Analysis

### Wati ($49-99/month)
- **Strength**: Official WhatsApp BSP, good UI, message templates
- **Weakness**: No real AI (rule-based chatbot), no website included
- **Our edge**: Real AI + website combo, similar price

### Tidio ($29-59/month) 
- **Strength**: Good web chat widget, e-commerce focus, free tier
- **Weakness**: WhatsApp costs extra, AI is basic, no Hungarian focus
- **Our edge**: Native Hungarian, WhatsApp included, we do the setup

### Manychat ($15-100+/month)
- **Strength**: Cheap, good for Instagram/Facebook
- **Weakness**: WhatsApp expensive add-on, no real AI, DIY setup
- **Our edge**: Done-for-you setup, real AI, website included

### HubSpot ($450-800/month for AI)
- **Strength**: Full CRM, enterprise-grade
- **Weakness**: Way too expensive for SMBs, complex
- **Our edge**: 10x cheaper, simpler, same AI quality for SMB needs

### **Our positioning**: 
"Done-for-you AI assistant + website for local businesses. Real AI, not scripts. Setup in 24h. From $55/month."
- Cheaper than Wati/HubSpot
- Better AI than Tidio/Manychat
- Website included (nobody else does this)
- We do the setup (nobody else does this for SMBs)

---

## 5. Architecture Decision

### Per-client setup:
1. OpenClaw agent with client-specific config
2. WhatsApp Business API number (shared or dedicated)
3. Knowledge base JSON (structured)
4. System prompt (generated from onboarding form)
5. Web chat widget (embeddable JS snippet)

### Multi-tenant approach:
- One OpenClaw gateway, multiple agents
- Each agent = one client
- Shared infrastructure, isolated data
- Easy to scale (just add agents)

### OR: Standalone lightweight bot (simpler, more scalable):
- Simple Python/Node service per client
- Direct OpenAI/Anthropic API calls
- WhatsApp Cloud API webhook
- Hosted on single VPS ($5-20/month handles 50+ clients)
- **This is probably better for scale**
