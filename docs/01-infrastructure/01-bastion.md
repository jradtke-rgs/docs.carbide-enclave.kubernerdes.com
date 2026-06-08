---
title: Bastion Setup (nuc-00)
sidebar_position: 1
---

# Bastion Setup (nuc-00)

nuc-00 is the airgap boundary host. It runs all infrastructure services for the enclave and is the only host that ever touches the internet (pre-airgap, during artifact collection).

## Status: Complete ✅

All services verified active.

## Services running on nuc-00

| Service | Package | Port(s) |
|---|---|---|
| NTP | `chrony` | 123/udp |
| DNS | `bind` (named) | 53/tcp+udp |
| DHCP + iPXE | `dhcp-server` | 67/udp |
| Web / file server | `apache2` + PHP 8 | 80/tcp |
| TFTP | `tftp` | 69/udp |
| Internal CA | `step-ca` | 8443/tcp |
| Hauler registry | `hauler` | 5000/tcp |

## Bootstrap script

```bash
sudo bash /srv/www/htdocs/carbide-enclave.kubernerdes.com/scripts/bootstrap-nuc-00.sh
```

Idempotent — safe to re-run.

## OpenSUSE Leap 15.6 gotchas

- **BIND**: root hints file is `root.hint` (not `named.ca`); zone files live at `/var/lib/named/`, not `master/`.
- **dhcpd**: no `dhcpd` group — use `id -g dhcpd` numerically.
- **TFTP**: package is `tftp` (not `tftp-server`).
- **kubectl**: not in default repos; add `https://pkgs.k8s.io/core:/stable:/v1.33/rpm/` with `--gpg-auto-import-keys`.
- **php8-yaml**: not available — `kubernerdes.php` has a built-in YAML fallback parser.

## DNS

Authoritative for `carbide-enclave.kubernerdes.com` and `0.0.10.in-addr.arpa`.

Key records:

```
nuc-00    A      10.0.0.10
ca        CNAME  nuc-00      ; step-ca internal CA
nuc-01    A      10.0.0.101
nuc-02    A      10.0.0.102
nuc-03    A      10.0.0.103
spark     A      10.0.0.251
harvester A      10.0.0.100
rancher   A      10.0.0.30
harbor    A      10.0.0.99
keycloak  A      10.0.0.98
*.harbor  A      10.0.0.99
```

## iPXE boot chain

```
node powers on
  → DHCP (nuc-00:67) → offers IP + next-server + filename=ipxe.efi
  → TFTP (nuc-00:69) → serves ipxe.efi
  → iPXE re-DHCPs (user-class=iPXE)
  → DHCP returns filename=http://10.0.0.10/harvester/harvester/ipxe-menu
  → iPXE loads menu over HTTP → node-specific Harvester install boots
```

Node-specific DHCP host entries (with fixed IPs and MAC addresses) route each node to the correct Harvester config automatically.
