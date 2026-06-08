---
title: Harvester
sidebar_position: 1
---

# Harvester Bare-Metal Install

:::info In progress
Harvester v1.7.1-govt.2 bare-metal install on nuc-01/02/03 via iPXE.
:::

## Overview

Three-node Harvester HCI cluster on nuc-01, nuc-02, nuc-03. nuc-01 creates the cluster; nuc-02 and nuc-03 join.

## Prerequisites

- Hauler store loaded and `hauler store serve registry` running on nuc-00 port 5000
- Harvester iPXE assets in `/srv/www/htdocs/harvester/v1.7.1-amd64-govt.2/`
- Node configs generated and in `/srv/www/htdocs/harvester/harvester/`
- DHCP host entries in place for nuc-01/02/03 MAC addresses

## Install procedure

1. Boot nuc-01 via PXE — selects **Deploy Harvester to nuc-01 (create cluster)** from the iPXE menu (or auto-selects after timeout)
2. Wait for nuc-01 to complete install and cluster to form (VIP `10.0.0.100` becomes reachable)
3. Boot nuc-02 → joins cluster
4. Boot nuc-03 → joins cluster

## Regenerating configs

If node configs need to be updated:

```bash
bash /srv/www/htdocs/carbide-enclave.kubernerdes.com/infra/nuc-00/srv/www/htdocs/harvester/harvester/generate-harvester-configs.sh
```
