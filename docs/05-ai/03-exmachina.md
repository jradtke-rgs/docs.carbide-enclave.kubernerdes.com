---
title: ExMachina — Agentic AI Layer
sidebar_position: 3
---

# ExMachina — Agentic AI Layer

ExMachina is the agentic AI layer running on the carbide-enclave hardware stack. It sits above the infrastructure documented in this site and turns the DGX Spark + Harvester cluster into a goal-directed, air-gap-capable agentic platform.

**Repo:** [github.com/cloudxabide/ExMachina](https://github.com/cloudxabide/ExMachina)

---

## What It Is

> "A sovereign, air-gap-capable agentic AI platform with physical edge presence."

ExMachina is not a chat wrapper. It is a goal-directed agentic system with tools, perception, and physical reach — a 120B-parameter model on the DGX Spark serving as the cognitive core, a multi-agent NemoClaw crew orchestrating tasks across the cluster, a live RAG layer grounding the model in real operational state, and a Jetbot acting as a first-class physical edge agent.

```
┌─────────────────────────────────────┐
│           OpenClaw (agent)          │  ← the "brain" / agentic loop
├─────────────────────────────────────┤
│     OpenShell (policy runtime)      │  ← sandboxing, guardrails, inference routing
├─────────────────────────────────────┤
│        NemoClaw (glue layer)        │  ← agent onboarding, lifecycle, blueprint mgmt
├─────────────────────────────────────┤
│  vLLM + nemotron-3-super120b:a12b   │  ← inference (MoE: 120B total / 12B active)
│         DGX Spark (hardware)        │
└─────────────────────────────────────┘
```

---

## Hardware Mapping

ExMachina runs on the same hardware documented in this site:

| Host | carbide-enclave role | ExMachina role |
|------|----------------------|----------------|
| nuc-0[1-3] | Harvester cluster nodes | Orchestration, Qdrant RAG, Authentik, Longhorn storage |
| spark (DGX Spark) | AI inference node | vLLM + nemotron-super 120B, LiteLLM proxy (port 40000), NemoClaw agent runtime |
| wall-e (Jetson Nano) | — | Physical edge agent — Waveshare Jetbot, perception + action |

---

## Software Stack

| Layer | Component | Status |
|-------|-----------|--------|
| Inference (primary) | vLLM — nemotron-3-super120b (120B / 12B active MoE) | Running |
| Inference proxy | LiteLLM — OpenAI-compatible API on port 40000 | Running |
| Agent Runtime | NemoClaw (OpenClaw + OpenShell) | Locked |
| RAG — Vector DB | Qdrant (K8s workload, Longhorn persistence) | Locked |
| RAG — Corpus | Live cluster state + runbooks + Jetbot sensor data | Locked |
| Identity & Auth | Authentik — OIDC/OAuth2 for all ExMachina services | Locked |
| Web UI | OpenWebUI | Planned |

:::note Identity provider
ExMachina uses **Authentik** (not Keycloak) as its identity provider. Both run on the same Harvester cluster but serve different service domains. Authentik was chosen for its container-native OIDC/OAuth2 support and alignment with the Kubernetes-native service stack.
:::

---

## The NemoClaw Crew

Eight NemoClaw agents run the platform. Full role definitions: [Agent_Roster.md](https://github.com/cloudxabide/ExMachina/blob/main/Agent_Roster.md)

| Agent | Responsibilities |
|-------|-----------------|
| **Architect** | Designs solutions; writes decisions to `ARCHITECTURE.md` |
| **Developer** | IaC, application code, RAG pipelines, Jetbot integration |
| **Implementer** | Executes deployments — Helm, kubectl, Harvester workloads, Longhorn |
| **Operations** | Monitors all stack endpoints; alerts on anomalies |
| **Finance** | Tracks token consumption, GPU utilization, storage growth |
| **Security** | Authentik policy auditing; air-gap egress enforcement; NeuVector; credential scanning |
| **RAG Curator** | Manages Qdrant corpus — ingestion, chunking, freshness, retrieval quality |
| **Edge Agent** | Runs Jetbot perception loop; formats sensor observations; dispatches actions |

---

## Security: Zero Trust for AI Agents

ExMachina applies Anthropic's [Zero Trust for AI Agents](https://claude.com/blog/zero-trust-for-ai-agents) framework (May 2026) to the full stack. Full security architecture: [Security.md](https://github.com/cloudxabide/ExMachina/blob/main/Security.md)

### Shared Responsibility Model

| Layer | What It Covers | ExMachina Owner |
|-------|---------------|-----------------|
| **Model** | Foundational safety alignment | Anthropic (Claude), NVIDIA (nemotron-super) |
| **Harness** | System prompts, crew policies, guardrails | NemoClaw crew config; OpenShell out-of-process policy |
| **Tools** | MCP servers, APIs — what agents can call | kubectl, Qdrant, LiteLLM, Jetbot dispatch API |
| **Environment** | Network, identity, secrets, deployment | Harvester/RKE2, Sophos XGS88, Authentik, Longhorn |

### Key Controls

- **OpenShell** enforces security policy out-of-process — even a compromised agent prompt cannot bypass guardrails
- **Least Agency**: agent tool grants are task-scoped and time-bounded, not standing session grants
- **Jetbot motion commands** require human-in-the-loop confirmation — physical actuators have the highest authorization bar
- **Air-gap invariant**: the running system never requires internet access; Sophos XGS88 enforces this at the perimeter
- **Prompt injection defense**: Jetbot sensor data and RAG corpus entries are treated as untrusted external input, not operator instructions

### Threat Model Summary

| Threat | ExMachina Surface |
|--------|------------------|
| Prompt injection | Jetbot sensor data, RAG corpus entries, tool outputs |
| Identity/privilege abuse | Agent sessions holding standing cluster-admin |
| Physical actuation abuse | Jetbot motion commands — real-world consequences |
| Memory poisoning | Adversarial data written into Qdrant corpus |
| Supply chain | Container images and model weights at bootstrap |

---

## Open Decisions

- Jetbot integration pattern (ROS2 vs. direct Python + MQTT) — deferred until inference layer is stable
- Secrets management beyond K8s Secrets (Vault vs. Sealed Secrets)
- Centralized log aggregation (Loki/Grafana preferred)
- Web UI: OpenWebUI likely but not yet locked

See [ARCHITECTURE.md](https://github.com/cloudxabide/ExMachina/blob/main/ARCHITECTURE.md) for the full decision log.
