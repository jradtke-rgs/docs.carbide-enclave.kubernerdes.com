---
title: Artifact Collection (Hauler)
sidebar_position: 3
---

# Artifact Collection (Hauler)

[Hauler](https://hauler.dev) is the RGS airgap transport tool. It collects OCI images, Helm charts, and binary files into a single store, packages them into a tarball for sneakernet transfer, and serves them as an OCI registry on the airgap side.

## Status: Complete ✅

9.2 GB store saved to `/srv/www/htdocs/hauler/carbide-enclave-<timestamp>.tar.zst`.

## Operator

`sync`, `save`, and `push` run as `mansible`. `serve` requires root.

## Credentials required

Set in `~/.config/RGS/creds` before running:

```bash
export CARBIDE_USERNAME="..."
export CARBIDE_PASSWORD="..."
export DOCKER_USERNAME="..."    # Docker Hub PAT (read-only scope)
export DOCKER_PASSWORD="..."
```

## Commands

```bash
# Pull all artifacts from upstream (needs internet)
bash scripts/hauler.sh sync

# Package store → timestamped tarball in web root
bash scripts/hauler.sh save

# Load tarball on airgap side
bash scripts/hauler.sh load /path/to/carbide-enclave-<timestamp>.tar.zst

# Start Hauler OCI registry on :5000 (used during Harvester + RKE2 install)
bash scripts/hauler.sh serve

# Push store → Harbor (after Harbor is up)
bash scripts/hauler.sh push

# sync + save in one shot (pre-airgap convenience)
bash scripts/hauler.sh all
```

## What gets collected

| Manifest | Contents |
|---|---|
| `rke2.yaml` | RKE2 runtime image + amd64/arm64 install tarballs |
| `cert-manager.yaml` | cert-manager Helm chart + images (amd64 + arm64) |
| `rancher.yaml` | Rancher Helm chart + images (Carbide registry) |
| `harvester.yaml` | Harvester iPXE assets + ISO (community build) |
| `harbor.yaml` | Harbor Helm chart + images |
| `keycloak.yaml` | Keycloak Helm chart + image |
| `gpu-operator.yaml` | GPU Operator Helm chart + image (amd64 + arm64) |

Manifests are **generated at runtime** from version vars in `scripts/env.d/carbide-enclave.sh` — do not create static manifest files.

## Airgap transfer

The tarball is web-accessible from nuc-00 immediately after `save`:

```
http://10.0.0.10/hauler/carbide-enclave-<timestamp>.tar.zst
```

Transfer via USB/sneakernet to the airgap side, then load with `hauler.sh load`.

## Version pinning

All versions are set in `scripts/env.d/carbide-enclave.sh`. Bumping a version there automatically flows into the next `sync` run.

:::note Docker Hub authentication
Anonymous Docker Hub pulls are rate-limited. A free Docker Hub account with a read-only Personal Access Token is required for the `harbor` manifest images.
:::

:::note Harvester government edition
The `harvester.yaml` manifest references community build URLs. The government edition (`v1.7.1-govt.2`) is placed manually on nuc-00's Apache server — it does not flow through Hauler.
:::
