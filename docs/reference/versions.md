---
title: Component Versions
sidebar_position: 1
---

# Component Versions

All versions are pinned in `scripts/env.d/carbide-enclave.sh` in the infra repo. Update there first — scripts inherit automatically.

| Component | Version | Notes |
|---|---|---|
| Hauler | v1.0.0 | RGS airgap transport |
| Harvester | v1.7.1-govt.2 | Government edition |
| RKE2 | v1.30.13+rke2r1 | Last confirmed multi-arch stable |
| Rancher Manager | v2.9.3 | |
| cert-manager | v1.14.5 | |
| Harbor | v2.11.0 | Helm chart 1.14.0 |
| Keycloak | 24.0.4 | |
| GPU Operator | v24.3.0 | |
| step-ca | v0.27.4 | |
| step CLI | v0.27.4 | Separate release cadence from step-ca |

:::warning Airgapped environments cannot tolerate version drift
Pin everything. A version bump requires a full Hauler re-sync before it can be used in the enclave.
:::
