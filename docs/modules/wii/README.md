# Wounded Injured and Ill Warriors (WII)

> Auto-generated module documentation by vista-module-gen
> Source: VA VistA Roll & Scroll documentation, RPC catalog (File 8994), FileMan data dictionary

## Overview

| Property | Value |
|----------|-------|
| Namespace | `WII` |
| Tier | 5 |
| FileMan Files | 0 |
| RPCs | 1 |
| Menu Options | 4 |

## FileMan Files

No FileMan file metadata available for this package.

## Remote Procedure Calls (RPCs)

### `WII ADT`

| Property | Value |
|----------|-------|
| Tag | `EN` |
| Routine | `WIIADT1` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |

**Description:** This remote procedure is run ONLY at the central collection point. It generates a list of all admissions and discharges that have been transferred to the main collection point.  The RPC allows the user to select all entries that have not been sent to DEFAS or regenerate the list by a date.  Data is

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DATE | LIST | No |

**API Endpoint:** `GET /vista/wii/rpc/wii-adt`

---


## Menu Options

### Run routine

| Name | Security Key |
|------|-------------|
| WII REVIEW ADT EVENTS | — |
| WII BUILD ADT EVENTS | — |

### Server

| Name | Security Key |
|------|-------------|
| WII ADT SERVER | — |

### Broker

| Name | Security Key |
|------|-------------|
| WII RPCS | — |

## Security Keys

No security keys defined for this package.

## API Route Summary

All routes are prefixed with `/vista/wii/`.

| Method | Endpoint | RPC | Return Type |
|--------|----------|-----|-------------|
| GET | `/vista/wii/rpc/wii-adt` | WII ADT | GLOBAL ARRAY |
