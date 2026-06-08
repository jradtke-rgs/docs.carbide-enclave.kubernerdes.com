---
title: RGS Carbide Enclave
slug: /
sidebar_position: 1
---

# RGS Carbide Enclave

End-to-end **airgapped** deployment of the RGS Carbide suite running in an enclave network with an NVIDIA DGX Spark for AI workload serving.

## What this is

A fully airgapped Kubernetes environment built on:

| Component | Role |
|---|---|
| Harvester | Bare-metal hypervisor / HCI platform |
| RKE2 | Kubernetes management cluster |
| Rancher Manager | Cluster lifecycle + RBAC |
| Harbor | OCI container registry |
| Keycloak | OIDC identity provider |
| cert-manager + step-ca | Internal PKI / TLS everywhere |
| Hauler | Airgap artifact transport |
| NVIDIA DGX Spark | arm64 AI inference node |

## Hardware

| Host | Role | Model | RAM |
|---|---|---|---|
| nuc-00 | Bastion / admin | NUC13ANHi3 | 32 GB |
| nuc-01 | Harvester node 1 | NUC10i7FNH | TBD |
| nuc-02 | Harvester node 2 | NUC10i7FNH | TBD |
| nuc-03 | Harvester node 3 | NUC10i7FNH | TBD |
| spark | NVIDIA DGX Spark (arm64) | GB10 | 128 GB |
| nas | NAS / NFS | ASUS X99 | 94 GB |

## Network

| Item | Value |
|---|---|
| Domain | `carbide-enclave.kubernerdes.com` |
| Subnet | `10.0.0.0/22` |
| Bastion (nuc-00) | `10.0.0.10` |
| Harvester VIP | `10.0.0.100` |
| Rancher VIP | `10.0.0.30` |
| Harbor VIP | `10.0.0.99` |
| Keycloak VIP | `10.0.0.98` |
| DGX Spark | `10.0.0.251` |

## Bootstrap order

```
1. Bastion setup (nuc-00)     ✅ complete
   ├── DNS, DHCP, NTP, web, TFTP
   └── step-ca (internal root CA)  ✅ complete
2. Hauler collect              ✅ complete
3. Harvester bare-metal install
4. RKE2 management cluster
5. cert-manager + StepIssuer
6. Harbor
7. Keycloak
8. Rancher Manager
9. DGX Spark + GPU Operator
10. AI serving (vLLM / Ollama)
```

## Repositories

- **Infra repo**: [carbide-enclave.kubernerdes.com](https://github.com/jradtke-rgs/carbide-enclave.kubernerdes.com) — scripts, configs, Terraform, Packer
- **Docs repo**: [docs.carbide-enclave.kubernerdes.com](https://github.com/jradtke-rgs/docs.carbide-enclave.kubernerdes.com) — this site
