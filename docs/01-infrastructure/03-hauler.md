---
title: Artifact Collection (Hauler)
sidebar_position: 3
---

# Artifact Collection (Hauler)

[Hauler](https://hauler.dev) is the RGS airgap transport tool. It collects OCI images, Helm charts,
and binary files into a self-contained store, packages the store into a tarball for sneakernet transfer,
and serves the contents as an OCI-compatible registry and file server on the airgap side.

**Status: Complete ✅** — 9.2 GB store saved to `/srv/www/htdocs/hauler/`.

---

## References

| Resource | URL |
|---|---|
| Hauler docs | https://hauler.dev |
| Hauler GitHub | https://github.com/hauler-dev/hauler |
| RGS Carbide docs | https://ranchercarbide.dev/docs |
| RGS airgap blog | https://ranchergovernment.com/blog/airgapping-made-easy-with-rke2-and-rancher |

---

## How Hauler works

Hauler organizes everything around a **store** — a local OCI-layout directory (default `/var/lib/hauler/`).
The store is content-addressed, so re-running `sync` only downloads what has changed.

Manifests describe what to collect using three Kubernetes-style resource kinds:

| Kind | What it collects |
|---|---|
| `Images` | OCI container images (multi-arch via `platforms:`) |
| `Charts` | Helm charts from any Helm repo URL |
| `Files` | Arbitrary files or tarballs from any HTTPS URL |

A single manifest file can contain multiple resources of any kind. In this enclave, manifests are
**generated at runtime** from version variables in `scripts/env.d/carbide-enclave.sh` — bumping a
version there automatically flows into the next `sync`.

---

## Prerequisites

### Disk space

The full enclave store (all components below) is approximately **9–12 GB** uncompressed.
Plan for at least **25 GB** free on the bastion host to accommodate the store, the compressed
tarball, and working space during `sync`.

| Path | Purpose | Notes |
|---|---|---|
| `/var/lib/hauler/` | Hauler store | Content-addressed; safe to re-sync |
| `/srv/www/htdocs/hauler/` | Tarball output + manifest files | Web-accessible from nuc-00 |

### Network access (pre-airgap only)

`sync` must run on a host with outbound HTTPS to the following:

| Registry / URL | Used for |
|---|---|
| `registry.ranchercarbide.dev` | Carbide-signed Rancher + RKE2 images |
| `rgcrprod.azurecr.us` | Carbide Gov registry — required for `--products` RKE2 sync |
| `docker.io` | Harbor images (rate-limited without auth) |
| `quay.io` | cert-manager + Keycloak images |
| `nvcr.io` | NVIDIA GPU Operator image |
| `charts.jetstack.io` | cert-manager Helm chart |
| `charts.rancher.com` | Rancher Helm chart |
| `helm.goharbor.io` | Harbor Helm chart |
| `charts.bitnami.com` | Keycloak Helm chart |
| `helm.ngc.nvidia.com` | GPU Operator Helm chart |
| `github.com` | RKE2 binary tarballs + checksums |
| `releases.rancher.com` | Harvester community ISO + iPXE assets |
| `get.hauler.dev` | Hauler install script (if not already installed) |
| `get.rke2.io` | RKE2 install script |

### Credentials

Set in `~/.config/RGS/creds` before running any `hauler.sh` command:

```bash
# Carbide registry (both registries use the same credentials)
export CARBIDE_USERNAME="..."
export CARBIDE_PASSWORD="..."

# Docker Hub — read-only Personal Access Token to avoid anonymous rate limits
export DOCKER_USERNAME="..."
export DOCKER_PASSWORD="..."

# Harbor admin — needed for the push phase (after Harbor is up)
export HARBOR_ADMIN_PASSWORD="..."
```

`~/.config/RGS/creds` is outside any git directory and is never committed. See
`scripts/env.d/creds.example` for the expected variable names.

### Operator privilege

| Command | Required user |
|---|---|
| `sync`, `save`, `push` | `mansible` (non-root) |
| `serve`, `serve-files` | `root` (binds to low ports; manages store dir) |
| `load` | `root` (writes to `/var/lib/hauler/`) |

---

## The Hauler lifecycle

```
  ┌─────────────────────────────────────────────────────────────────┐
  │  Internet-connected side (nuc-00, pre-airgap)                  │
  │                                                                 │
  │  1. hauler.sh sync   ← pulls images/charts/files into store    │
  │  2. hauler.sh save   ← packages store → .tar.zst tarball       │
  └───────────────────────────┬─────────────────────────────────────┘
                              │  USB / sneakernet
  ┌───────────────────────────▼─────────────────────────────────────┐
  │  Airgap side (nuc-00 after boundary crossing)                  │
  │                                                                 │
  │  3. hauler.sh load   ← unpacks tarball back into store         │
  │  4. hauler.sh serve  ← OCI registry :5000  (Harvester + RKE2) │
  │  5. hauler.sh push   ← migrates store → Harbor (permanent)     │
  └─────────────────────────────────────────────────────────────────┘
```

**Phase 1 — sync:** Hauler reads each manifest, authenticates to upstream registries, and pulls
all content into the local store. The `--products rke2=<version>` flag pulls the full RKE2
component image set (pause, etcd, CNI plugins, etc.) that isn't enumerated in the manual manifest.

**Phase 2 — save:** The store is packaged into a timestamped, zstd-compressed tarball and written
to `/srv/www/htdocs/hauler/`. The tarball is immediately web-accessible from nuc-00 at
`http://10.0.0.10/hauler/`.

**Phase 3 — load:** On the airgap side, the tarball is extracted back into the Hauler store.
This is the mirror of `save`.

**Phase 4 — serve:** Hauler starts an OCI-compatible registry on port 5000. During Harvester
node install and RKE2 bootstrap, nodes pull images from this registry before Harbor exists.

**Phase 5 — push:** Once Harbor is running, all content is migrated from the ephemeral Hauler
registry into Harbor's permanent registry. After this point, Harbor is the authoritative OCI
source for the enclave.

---

## Manifest format

Manifests use Kubernetes-style YAML with Hauler's custom API kinds. Here is an annotated excerpt
from the generated `cert-manager.yaml`:

```yaml
# Charts — fetched from a Helm repo URL and stored verbatim
apiVersion: content.hauler.cattle.io/v1alpha1
kind: Charts
metadata:
  name: cert-manager-chart
spec:
  charts:
    - name: cert-manager
      repoURL: https://charts.jetstack.io
      version: "v1.14.5"
---
# Images — pulled by digest, stored in OCI layout
apiVersion: content.hauler.cattle.io/v1alpha1
kind: Images
metadata:
  name: cert-manager-images
spec:
  images:
    - name: quay.io/jetstack/cert-manager-controller:v1.14.5
      platforms:
        - linux/amd64
        - linux/arm64   # required — cert-manager runs on DGX Spark nodes
```

And a `Files` example from `rke2.yaml`:

```yaml
apiVersion: content.hauler.cattle.io/v1alpha1
kind: Files
metadata:
  name: rke2-binaries
spec:
  files:
    - path: https://github.com/rancher/rke2/releases/download/v1.32.13%2Brke2r2/rke2.linux-amd64.tar.gz
    - path: https://github.com/rancher/rke2/releases/download/v1.32.13%2Brke2r2/rke2.linux-arm64.tar.gz
```

Manifests are written to `/srv/www/htdocs/hauler/manifests/` and are browseable at
`http://10.0.0.10/hauler/manifests/` for reference after each `sync`.

---

## What gets collected

| Manifest | Content types | arm64? |
|---|---|---|
| `rke2.yaml` | Runtime image + amd64/arm64 install tarballs + install script | Yes |
| `cert-manager.yaml` | Helm chart + 5 controller images | Yes |
| `rancher.yaml` | Helm chart + Rancher + shell images (Carbide registry) | Yes |
| `harvester.yaml` | Community ISO + iPXE vmlinuz/initrd/rootfs/squashfs | amd64 only |
| `harbor.yaml` | Helm chart + 10 Harbor component images | amd64 only |
| `keycloak.yaml` | Helm chart + Keycloak image | Yes |
| `gpu-operator.yaml` | Helm chart + GPU Operator image | Yes |

Additionally, `hauler store sync --products rke2=<version>` pulls the full RKE2 component
image set (pause, etcd, CoreDNS, Canal CNI, etc.) that is not enumerated in the manifest.

---

## Commands

```bash
# Pull all artifacts from upstream into the Hauler store (needs internet)
bash scripts/hauler.sh sync

# Package store → timestamped tarball in web root
bash scripts/hauler.sh save

# sync + save in one shot (pre-airgap convenience)
bash scripts/hauler.sh all

# Load a tarball into the store (airgap side, run as root)
sudo bash scripts/hauler.sh load /path/to/carbide-enclave-<timestamp>.tar.zst

# Start Hauler OCI registry on :5000 (used during Harvester + RKE2 install)
sudo bash scripts/hauler.sh serve

# Start Hauler file server on :8080 (alternative binary distribution)
sudo bash scripts/hauler.sh serve-files

# Push store contents → Harbor (after Harbor is up)
bash scripts/hauler.sh push
```

Hauler is auto-installed by `hauler.sh sync` if not already present. Non-root installs go to
`~/.local/bin/`; root installs go to `/usr/local/bin/`.

---

## Airgap transfer

After `save`, the tarball is immediately web-accessible:

```
http://10.0.0.10/hauler/carbide-enclave-<timestamp>.tar.zst
```

Transfer to the airgap side via USB, external drive, or any out-of-band method. Then load:

```bash
sudo bash scripts/hauler.sh load /path/to/carbide-enclave-<timestamp>.tar.zst
```

---

## Version management

All component versions are set in `scripts/env.d/carbide-enclave.sh`:

```bash
RKE2_VERSION="v1.32.13+rke2r2"
RANCHER_VERSION="v2.9.3"
CERT_MANAGER_VERSION="v1.14.5"
HARBOR_VERSION="2.11.0"
HARBOR_CHART_VERSION="1.14.0"   # Helm chart version — differs from app version
KEYCLOAK_VERSION="24.0.4"
HAULER_VERSION="v1.0.0"
GPU_OPERATOR_VERSION="v24.3.0"
```

Bumping a version in that file and re-running `hauler.sh sync` is the complete update workflow —
manifests are regenerated automatically before each sync.

:::caution Harbor chart vs app version
Harbor's Helm chart version (`HARBOR_CHART_VERSION`) and its application image tag
(`HARBOR_VERSION`) are **not the same**. Both must be set correctly. Mismatching them produces
images that don't match what the chart expects.
:::

---

## Things to consider

### Docker Hub rate limiting

Anonymous pulls from `docker.io` are rate-limited to ~100 pulls per 6 hours per IP. Harbor images
(which are only available on Docker Hub) will fail `sync` without authentication. A free Docker Hub
account with a **read-only Personal Access Token** is sufficient and required.

### Carbide Gov registry is separate

`registry.ranchercarbide.dev` (Carbide images) and `rgcrprod.azurecr.us` (Carbide Gov, used for
`--products` sync) are **different registries** that both require the same Carbide credentials.
`hauler.sh sync` logs in to both explicitly.

### RKE2 version string normalization

The RKE2 version `v1.32.13+rke2r2` has two forms used in different contexts:

| Context | Form | Example |
|---|---|---|
| OCI image tags | `+` → `-` | `v1.32.13-rke2r2` |
| GitHub download URLs | `+` → `%2B` | `v1.32.13%2Brke2r2` |

`hauler.sh` handles both transformations automatically. If writing custom manifests, be aware of
which form each context requires.

### RKE2 image tarballs are not on GitHub for v1.30+

For RKE2 v1.30 and later, the `rke2-images.linux-amd64.tar.gz` bundle is no longer published to
GitHub releases. Use `hauler store sync --products rke2=<version>` instead — it pulls the
component images directly from the Carbide registry and is the supported path for Carbide
customers.

### arm64 parity

Any image or binary that runs on or is managed by the DGX Spark (arm64) must have an explicit
`linux/arm64` platform entry in its manifest. Omitting it means the image will not be in the
store and the DGX Spark workload will fail to pull at runtime — with no error at `sync` time.

Components currently amd64-only (Harbor, Harvester) do not run on the DGX Spark directly.
Everything else — cert-manager, Rancher, GPU Operator, RKE2 runtime — must be multi-arch.

### Hauler registry is temporary

The `hauler store serve registry` on port 5000 is an **ephemeral** registry used only during the
Harvester install and RKE2 bootstrap phases, before Harbor is available. Once Harbor is running and
`hauler.sh push` has completed, Harbor is the authoritative registry. Stop the Hauler serve process
after the push is confirmed.

### Harvester government edition is not in the store

The Harvester government edition (`v1.7.1-govt.2`) is placed manually on nuc-00's Apache web root
and is not collected by Hauler. The `harvester.yaml` manifest references community build URLs for
reference only. Government edition assets are not publicly downloadable and must be transferred
separately.
