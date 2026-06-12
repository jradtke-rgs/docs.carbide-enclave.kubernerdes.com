---
title: Internal CA (step-ca)
sidebar_position: 2
---

# Internal CA (step-ca)

[Smallstep step-ca](https://smallstep.com/docs/step-ca) is the enclave's internal root CA. It provides:

- A self-hosted root + intermediate PKI
- An ACME server for cert-manager integration
- The trust anchor for all TLS in the enclave

**Status: Complete ✅** — Service running on nuc-00 port 8443.

---

## Design decisions

| Decision | Choice |
|---|---|
| CA software | step-ca (Smallstep) |
| Reason | ACME support, cert-manager StepIssuer, fully airgap-capable |
| Host | nuc-00 (`ca.carbide-enclave.kubernerdes.com`) |
| Port | 8443 |
| Key type | ECDSA P-256 |
| Validity | Root: 10 years; issued certs: cert-manager defaults |

---

## Bootstrap (nuc-00)

```bash
sudo bash /srv/www/htdocs/carbide-enclave.kubernerdes.com/scripts/bootstrap-step-ca.sh
```

Requires internet access to download binaries — run before crossing the airgap boundary.
Reads `STEP_CA_PASSWORD` from `~/.config/RGS/creds`. If not set, generates a random password and prints it.

## Key paths on nuc-00

| Path | Contents |
|---|---|
| `/etc/step-ca/config/ca.json` | CA configuration (provisioners, address, etc.) |
| `/etc/step-ca/certs/root_ca.crt` | Root CA certificate |
| `/etc/step-ca/certs/intermediate_ca.crt` | Intermediate CA certificate |
| `/etc/step-ca/password.txt` | Key encryption password (root:step, 640) |

## Verification

```bash
# Health check
curl -s https://ca.carbide-enclave.kubernerdes.com:8443/health

# ACME directory (used by cert-manager)
curl -s https://ca.carbide-enclave.kubernerdes.com:8443/acme/acme/directory

# Root CA fingerprint (needed for client bootstraps)
sudo step certificate fingerprint /etc/step-ca/certs/root_ca.crt

# Service status
systemctl status step-ca
```

## ACME provisioner

The `acme` ACME provisioner is configured at install time. cert-manager's `StepIssuer` CRD uses it to issue cluster certificates.

ACME directory URL:
```
https://ca.carbide-enclave.kubernerdes.com:8443/acme/acme/directory
```

---

## Client onboarding

Different host types in the enclave need the CA trust in different ways. The approach depends on
whether the host runs workloads (`step` CLI useful) or just needs TLS to work (trust store only).

### The `step` CLI is not pre-installed

`step` is a Smallstep-specific tool — it is **not** available in any SL-Micro, SLE Micro, or
Harvester package repository. It must be distributed manually.

**Airgap distribution (recommended):** The `step` binary is copied to nuc-00's Apache web root
during CA bootstrap, making it available at:

```
http://10.0.0.10/step/step-linux-amd64        # for SL-Micro RKE2 nodes
http://10.0.0.10/step/step-linux-arm64        # for DGX Spark
```

See [Hauler — adding step to the store](03-hauler.md) if you want it to flow through Hauler instead.

**Pre-airgap:** The bootstrap script installs it to `/usr/local/bin/step` on nuc-00. Copy it
from there to the Apache web root so it is available on the airgap side:

```bash
# Run on nuc-00 as mansible/root after bootstrap-step-ca.sh completes
sudo mkdir -p /srv/www/htdocs/step
sudo cp /usr/local/bin/step /srv/www/htdocs/step/step-linux-amd64
# arm64 binary must be downloaded separately (see hauler.sh for the arm64 URL)
```

### Get the CA fingerprint

All client bootstraps require the root CA fingerprint. Retrieve it from nuc-00:

```bash
sudo step certificate fingerprint /etc/step-ca/certs/root_ca.crt
```

Or, since nuc-00 is the trusted airgap boundary host and you control it entirely, the root cert
can also be fetched over plain HTTP — the fingerprint verification in `step ca bootstrap` confirms
the cert matches what you expect, regardless of transport:

```bash
# Fetch the cert and compute its fingerprint locally
curl -sk https://ca.carbide-enclave.kubernerdes.com:8443/roots.pem \
  | openssl x509 -fingerprint -sha256 -noout
```

---

### Scenario A — SL-Micro hosts (RKE2 VMs)

:::note Automated — no manual steps needed
`bootstrap-rke2.sh` handles CA trust on the RKE2 VMs automatically. It SCPs the root cert
from nuc-00 and runs `update-ca-certificates` on each node before installing RKE2. You do not
need to install the `step` CLI on these nodes.
:::

The manual procedure below applies to any SL-Micro host **not** covered by a bootstrap script —
for example, a one-off node added to the enclave after initial cluster standup.

`/etc` on SL-Micro is a writable overlay — no `transactional-update` is required for trust store
changes. `/usr/local/bin` is also writable in the RKE2 deployment configuration.

**Step 1 — install the `step` CLI:**

```bash
curl -fsSL http://10.0.0.10/step/step-linux-amd64 -o /usr/local/bin/step
chmod 755 /usr/local/bin/step
```

**Step 2 — bootstrap and install the root CA:**

The `--install` flag writes the root cert to `/etc/pki/trust/anchors/` and calls
`update-ca-certificates` automatically.

```bash
step ca bootstrap \
    --ca-url https://ca.carbide-enclave.kubernerdes.com:8443 \
    --fingerprint <fingerprint> \
    --install
```

**Step 3 — verify:**

```bash
# System trust (curl should succeed without -k)
curl -s https://ca.carbide-enclave.kubernerdes.com:8443/health
```

:::note Root vs non-root
`step ca bootstrap --install` needs root to write to `/etc/pki/trust/anchors/` and run
`update-ca-certificates`. Without `--install`, it runs as any user and only writes to `~/.step/`.
Run as root (or with `sudo`) when installing the system trust.
:::

---

### Scenario B — Harvester nodes

Harvester runs SLE Micro under the hood. **Do not install `step` or third-party packages directly
on Harvester nodes** — Harvester manages its own OS and package state.

Instead, inject the root CA certificate during the Harvester install via the node config, or add
it post-install using `transactional-update`.

#### Option 1 — inject via Harvester install config (preferred)

Embed the root CA PEM in the Harvester `os.write_files` section. step-ca must be bootstrapped on
nuc-00 before generating Harvester node configs, which it is (CA bootstrap is step 1; Harvester
install is step 4).

Add to `config-create-nuc-01.yaml` (and the join configs):

```yaml
os:
  write_files:
    - path: /etc/pki/trust/anchors/carbide-enclave-root-ca.crt
      permissions: '0644'
      content: |
        -----BEGIN CERTIFICATE-----
        <paste root_ca.crt PEM here>
        -----END CERTIFICATE-----
  after_install_chroot_commands:
    - update-ca-certificates
```

Get the PEM from nuc-00:
```bash
sudo cat /etc/step-ca/certs/root_ca.crt
```

#### Option 2 — post-install via transactional-update

If Harvester is already installed and running:

```bash
# SSH to the Harvester node
sudo transactional-update shell <<'EOF'
mkdir -p /etc/pki/trust/anchors
curl -fsSL http://10.0.0.10/step/carbide-enclave-root-ca.crt \
  -o /etc/pki/trust/anchors/carbide-enclave-root-ca.crt
update-ca-certificates
EOF
sudo reboot   # transactional-update changes require a reboot to take effect
```

#### containerd trust for Harbor image pulls

Harvester's containerd must trust the CA to pull images from Harbor. Configure this via
Harvester's `registries.yaml` (placed at `/etc/rancher/rke2/registries.yaml` on each node, or
managed via the Harvester UI under **Settings → Containerd Registry**):

```yaml
configs:
  "harbor.carbide-enclave.kubernerdes.com":
    tls:
      ca_file: /etc/pki/trust/anchors/carbide-enclave-root-ca.crt
```

:::note
If the CA cert was added to the system trust store (Scenario B above), containerd may pick it up
automatically depending on the Harvester version. Explicit `ca_file` is the safe path.
:::

---

### Scenario C — Kubernetes workloads (cert-manager)

Pods and services running inside the RKE2 cluster do **not** require manual `step` CLI
interaction. cert-manager's `StepIssuer` handles certificate issuance automatically via ACME.

The `StepIssuer` CRD is configured once per cluster (see [cert-manager](../04-platform/01-cert-manager.md)):

```yaml
apiVersion: certmanager.step.sm/v1beta1
kind: StepIssuer
metadata:
  name: step-issuer
  namespace: cert-manager
spec:
  url: https://ca.carbide-enclave.kubernerdes.com:8443
  caBundle: <base64-encoded root_ca.crt>
  provisioner:
    name: acme
    kind: ACME
```

After that, any `Certificate` resource referencing this issuer gets a cert automatically — no
per-pod `step` invocation needed.

---

### Scenario D — DGX Spark (arm64)

The DGX Spark joins as an RKE2 agent node. The procedure is identical to Scenario A (SL-Micro)
except the `step` binary must be the **arm64** build:

```bash
curl -fsSL http://10.0.0.10/step/step-linux-arm64 -o /usr/local/bin/step
chmod 755 /usr/local/bin/step

step ca bootstrap \
    --ca-url https://ca.carbide-enclave.kubernerdes.com:8443 \
    --fingerprint <fingerprint> \
    --install
```

Verify the binary architecture before running:
```bash
file /usr/local/bin/step
# → ELF 64-bit LSB executable, ARM aarch64
```

---

## Summary: what each host type needs

| Host type | `step` CLI | System trust store | containerd trust | Method |
|---|---|---|---|---|
| nuc-00 (bastion) | Yes — installed by bootstrap script | Yes — bootstrap script | n/a | `bootstrap-step-ca.sh` |
| SL-Micro RKE2 VMs | No — `bootstrap-rke2.sh` handles it | Yes — automated via `bootstrap-rke2.sh` | Via system trust | Scenario A (automated) |
| Harvester nodes | No | Yes — inject via install config or `transactional-update` | Explicit `ca_file` in registries.yaml | Scenario B |
| RKE2 workloads | No | n/a | n/a (cert-manager handles) | Scenario C |
| DGX Spark (arm64) | Yes — arm64 build | Yes — `step ca bootstrap --install` | Via system trust | Scenario D |
