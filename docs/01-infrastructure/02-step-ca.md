---
title: Internal CA (step-ca)
sidebar_position: 2
---

# Internal CA (step-ca)

[Smallstep step-ca](https://smallstep.com/docs/step-ca) is the enclave's internal root CA. It provides:

- A self-hosted root + intermediate PKI
- An ACME server for cert-manager integration
- The trust anchor for all TLS in the enclave

## Status: Complete ✅

Service running on nuc-00 port 8443.

## Design decisions

| Decision | Choice |
|---|---|
| CA software | step-ca (Smallstep) |
| Reason | ACME support, cert-manager StepIssuer, fully airgap-capable |
| Host | nuc-00 (`ca.carbide-enclave.kubernerdes.com`) |
| Port | 8443 |
| Key type | ECDSA P-256 |
| Validity | Root: 10 years; issued certs: cert-manager defaults |

## Bootstrap

```bash
sudo bash /srv/www/htdocs/carbide-enclave.kubernerdes.com/scripts/bootstrap-step-ca.sh
```

Requires internet access to download binaries — run before crossing the airgap boundary.

Reads `STEP_CA_PASSWORD` from `~/.config/RGS/creds`. If not set, generates a random password and prints it.

## Verification

```bash
# Health check
curl -s https://ca.carbide-enclave.kubernerdes.com:8443/health

# ACME directory (used by cert-manager)
curl -s https://ca.carbide-enclave.kubernerdes.com:8443/acme/acme/directory

# Root CA fingerprint (needed for StepIssuer and node bootstraps)
sudo /usr/local/bin/step certificate fingerprint /etc/step-ca/certs/root_ca.crt

# Service status
systemctl status step-ca
```

## Key paths on nuc-00

| Path | Contents |
|---|---|
| `/etc/step-ca/config/ca.json` | CA configuration (provisioners, address, etc.) |
| `/etc/step-ca/certs/root_ca.crt` | Root CA certificate |
| `/etc/step-ca/certs/intermediate_ca.crt` | Intermediate CA certificate |
| `/etc/step-ca/password.txt` | Key encryption password (root:step, 640) |

## ACME provisioner

The `acme` ACME provisioner is configured at install time. cert-manager's `StepIssuer` CRD uses it to issue cluster certificates.

ACME directory URL:
```
https://ca.carbide-enclave.kubernerdes.com:8443/acme/acme/directory
```

## Bootstrapping other hosts

Once the CA is running, add it to a host's trust store with:

```bash
step ca bootstrap \
    --ca-url https://ca.carbide-enclave.kubernerdes.com:8443 \
    --fingerprint <fingerprint>
```

The fingerprint is printed at the end of `bootstrap-step-ca.sh` and can be retrieved with:

```bash
sudo /usr/local/bin/step certificate fingerprint /etc/step-ca/certs/root_ca.crt
```
