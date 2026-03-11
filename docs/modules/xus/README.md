# XUS (XUS)

> Auto-generated module documentation by vista-module-gen
> Source: VA VistA Roll & Scroll documentation, RPC catalog (File 8994), FileMan data dictionary

## Overview

User accounts, access codes, security keys, menu assignments

| Property | Value |
|----------|-------|
| Namespace | `XUS` |
| Tier | 5 |
| FileMan Files | 6 |
| RPCs | 38 |
| Menu Options | 17 |
| VDL Manual | `kernel-technical-manual.pdf` |

## FileMan Files

| File # | Name | Fields | Global |
|--------|------|--------|--------|
| 200 | File #200 | ? | ? |
| 3.1 | File #3.1 | ? | ? |
| 19 | File #19 | ? | ? |
| 19.1 | File #19.1 | ? | ? |
| 8989.3 | File #8989.3 | ? | ? |
| 8989.5 | File #8989.5 | ? | ? |

## Remote Procedure Calls (RPCs)

### `XUS SIGNON SETUP`

| Property | Value |
|----------|-------|
| Tag | `SETUP` |
| Routine | `XUSRB` |
| Return Type | ARRAY |
| Parameter Count | 3 |
| Status | Inactive (may still be callable) |

**Description:** RPC ICR #1632 - API ICR #4054 Establishes the environment necessary for VistA sign-on.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | XWBUSRNM | LITERAL | No |
| 2 | ASOSKIP | LITERAL | No |
| 3 | D20 | LITERAL | No |

**API Endpoint:** `GET /vista/xus/rpc/xus-signon-setup`

---

### `XUS SEND KEYS`

| Property | Value |
|----------|-------|
| Tag | `SENDKEYS` |
| Routine | `XUSRB` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** Returns an array of strings that are used in the hashing algorithm. The strings that are returned are picked up from Z^XUSRB.

**API Endpoint:** `GET /vista/xus/rpc/xus-send-keys`

---

### `XUS AV CODE`

| Property | Value |
|----------|-------|
| Tag | `VALIDAV` |
| Routine | `XUSRB` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This API checks if a ACCESS/VERIFY code pair is valid. It returns an array of values   R(0)=DUZ if sign-on was OK, zero if not OK. R(1)=(0=OK, 1,2...=Can't sign-on for some reason). R(2)=verify needs changing. R(3)=Message. R(4)=0 R(5)=count of the number of lines of text, zero if none. R(5+n)=messa

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | AVCODE | LITERAL | No |

**API Endpoint:** `GET /vista/xus/rpc/xus-av-code`

---

### `XUS INTRO MSG`

| Property | Value |
|----------|-------|
| Tag | `INTRO` |
| Routine | `XUSRB` |
| Return Type | WORD PROCESSING |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** This RPC returns the INTRO message from the KERNEL SYSTEM PARAMETERS file.

**API Endpoint:** `GET /vista/xus/rpc/xus-intro-msg`

---

### `XUS KEY CHECK`

| Property | Value |
|----------|-------|
| Tag | `OWNSKEY` |
| Routine | `XUSRB` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** RPC ICR #6286 - API ICR #3277 This RPC will check if the user (DUZ) holds a security key or an array of keys. If a single security KEY is sent the result is returned in R(0). If an array is sent down then the return array has the same order as the calling array.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | KEY | REFERENCE | No |
| 2 | IEN | LITERAL | No |

**API Endpoint:** `GET /vista/xus/rpc/xus-key-check`

---

### `XUS CVC`

| Property | Value |
|----------|-------|
| Tag | `CVC` |
| Routine | `XUSRB` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** RPC ICR #6296 - API ICR #none This RPC is used as part of Kernel to allow the user to change their verify code.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | XU1 | LITERAL | No |

**API Endpoint:** `GET /vista/xus/rpc/xus-cvc`

---

### `XUS AV HELP`

| Property | Value |
|----------|-------|
| Tag | `AVHELP` |
| Routine | `XUSRB` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** Returns instructions on entering new access/verify codes.

**API Endpoint:** `GET /vista/xus/rpc/xus-av-help`

---

### `XUS DIVISION SET`

| Property | Value |
|----------|-------|
| Tag | `DIVSET` |
| Routine | `XUSRB2` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This RPC is used to set the user's selected Division in DUZ(2) during sign-on.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DIV | LITERAL | No |

**API Endpoint:** `POST /vista/xus/rpc/xus-division-set`

---

### `XUS GET USER INFO`

| Property | Value |
|----------|-------|
| Tag | `USERINFO` |
| Routine | `XUSRB2` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** Returns information about a user after logon.

**API Endpoint:** `GET /vista/xus/rpc/xus-get-user-info`

---

### `XUS DIVISION GET`

| Property | Value |
|----------|-------|
| Tag | `DIVGET` |
| Routine | `XUSRB2` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This RPC will return a list of divisions of a user.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | IEN | LITERAL | No |

**API Endpoint:** `GET /vista/xus/rpc/xus-division-get`

---

### `XUS KAAJEE GET USER VIA PROXY`

| Property | Value |
|----------|-------|
| Tag | `USERINFO` |
| Routine | `XUSKAAJ1` |
| Return Type | ARRAY |
| Parameter Count | 3 |
| Status | Inactive (may still be callable) |

**Description:** Returns a variety of information needed for KAAJEE logon based on the  ccow token

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | CLIENT-IP | LITERAL | No |
| 2 | SERVER-NM | LITERAL | No |
| 3 | CCOWTOK | LITERAL | No |

**API Endpoint:** `GET /vista/xus/rpc/xus-kaajee-get-user-via-proxy`

---

### `XUS KAAJEE GET CCOW TOKEN`

| Property | Value |
|----------|-------|
| Tag | `CCOWIP` |
| Routine | `XUSKAAJ1` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This RPC gets a token to save in the CCOW context to aid in sign-on

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | IP-ADDRESS | LITERAL | No |

**API Endpoint:** `GET /vista/xus/rpc/xus-kaajee-get-ccow-token`

---

### `XUS GET TOKEN`

| Property | Value |
|----------|-------|
| Tag | `ASH` |
| Routine | `XUSRB4` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**API Endpoint:** `GET /vista/xus/rpc/xus-get-token`

---

### `XUS CCOW VAULT PARAM`

| Property | Value |
|----------|-------|
| Tag | `CCOWPC` |
| Routine | `XUSRB4` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** This RPC returns a value for use with the CCOW vault.

**API Endpoint:** `GET /vista/xus/rpc/xus-ccow-vault-param`

---

### `XUS GET CCOW TOKEN`

| Property | Value |
|----------|-------|
| Tag | `CCOW` |
| Routine | `XUSRB4` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** This RPC gets a token to save in the CCOW context to aid in sign-on.

**API Endpoint:** `GET /vista/xus/rpc/xus-get-ccow-token`

---

### `XUS ALLKEYS`

| Property | Value |
|----------|-------|
| Tag | `ALLKEYS` |
| Routine | `XUSRB` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** RPC ICR #6287 - API ICR #3277 This RPC will return all the KEYS that a user holds. If the FLAG is set to some value the list of KEYS will be screened to only be those for J2EE use. The RPC was designed for FATKAAT and KAAJEE (VistALink clients) but  may be used by other applications.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | IEN | LITERAL | No |
| 2 | FLAG | LITERAL | No |

**API Endpoint:** `GET /vista/xus/rpc/xus-allkeys`

---

### `XUS SET VISITOR`

| Property | Value |
|----------|-------|
| Tag | `SETVISIT` |
| Routine | `XUSBSE1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** This controlled-subscription RPC is used by the Broker Security Enhancement on an authenticating VistA system to obtain a BSE TOKEN for an authenticated active user. The TOKEN is used to identify and authenticate a visiting user on a remote VistA system, which calls back to the authenticating system

**API Endpoint:** `POST /vista/xus/rpc/xus-set-visitor`

---

### `XUS GET VISITOR`

| Property | Value |
|----------|-------|
| Tag | `GETVISIT` |
| Routine | `XUSBSE1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This controlled-subscription RPC is used by the Broker Security  Enhancement to check a user's credentials based on a BSE TOKEN that was passed to identify and authenticate a visiting user. The remote VistA system calls this RPC on the authenticating VistA system to validate if the visiting user is

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | TOKEN | LITERAL | No |

**API Endpoint:** `GET /vista/xus/rpc/xus-get-visitor`

---

### `XUS KAAJEE GET USER INFO`

| Property | Value |
|----------|-------|
| Tag | `USERINFO` |
| Routine | `XUSKAAJ` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** Returns a variety of information needed for the KAAJEE logon.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | CLIENT-IP | LITERAL | No |
| 2 | SERVER-NM | LITERAL | No |

**API Endpoint:** `GET /vista/xus/rpc/xus-kaajee-get-user-info`

---

### `XUS KAAJEE LOGOUT`

| Property | Value |
|----------|-------|
| Tag | `SIGNOFF` |
| Routine | `XUSKAAJ` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This RPC calls the LOUT^XUSCLEAN tag to mark a KAAJEE-signed-on user's entry in the sign-on log as signed off.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SIGNON-LOG-DA | LITERAL | No |

**API Endpoint:** `GET /vista/xus/rpc/xus-kaajee-logout`

---

### `XUS PKI GET UPN`

| Property | Value |
|----------|-------|
| Tag | `GETUPN` |
| Routine | `XUSER2` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** This RPC gets the SUBJECT ALTERNATIVE NAME field from the New Person (#200) file field 501.2.  It is used to check that the correct PIV card has been put into the reader.

**API Endpoint:** `GET /vista/xus/rpc/xus-pki-get-upn`

---

### `XUS PKI SET UPN`

| Property | Value |
|----------|-------|
| Tag | `SETUPN` |
| Routine | `XUSER2` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This RPC is used to set the SUBJECT ALTERNATIVE NAME in the New Person #(200) file field 501.2.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | UPN | LITERAL | No |

**API Endpoint:** `POST /vista/xus/rpc/xus-pki-set-upn`

---

### `XUS IAM ADD USER`

| Property | Value |
|----------|-------|
| Tag | `IAMAU` |
| Routine | `XUESSO3` |
| Return Type | ARRAY |
| Parameter Count | 8 |
| Status | Inactive (may still be callable) |

**Description:** RPC ICR #6290 - API ICR #none This restricted RPC is used exclusively by the Identity and Access  Management (IAM) Provisioning application to add a user to the VistA NEW PERSON file (#200).   The XUSPF200 Security Key is required to add a user without an SSN (file #200 special privileges).

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | NAME | LITERAL | No |
| 2 | SECID | LITERAL | No |
| 3 | EMAIL | LITERAL | No |
| 4 | ADUPN | LITERAL | No |
| 5 | SSN | LITERAL | No |
| 6 | DOB | LITERAL | No |
| 7 | STATION | LITERAL | No |
| 8 | AUTHCODE | LITERAL | No |

**API Endpoint:** `POST /vista/xus/rpc/xus-iam-add-user`

---

### `XUS IAM EDIT USER`

| Property | Value |
|----------|-------|
| Tag | `IAMEU` |
| Routine | `XUESSO3` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** RPC ICR #6291 - API ICR #none This restricted RPC is used exclusively by the Identity and Access  Management (IAM) Provisioning application to edit an existing user in the VistA NEW PERSON file (#200).   The XUSHOWSSN Security Key is required to edit Personally Identifiable Information (PII) such as

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | INARRY | REFERENCE | No |
| 2 | AUTHCODE | LITERAL | No |

**API Endpoint:** `GET /vista/xus/rpc/xus-iam-edit-user`

---

### `XUS IAM FIND USER`

| Property | Value |
|----------|-------|
| Tag | `IAMFU` |
| Routine | `XUESSO3` |
| Return Type | ARRAY |
| Parameter Count | 6 |
| Status | Inactive (may still be callable) |

**Description:** RPC ICR #6288 - API ICR #none This restricted RPC is used exclusively by the Identity and Access  Management (IAM) Provisioning application to find a list of users that  satisfy a collection of input criteria.   One or more of the input array values must be set by the calling  application. The XUSHO

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | NAME | LITERAL | No |
| 2 | SSN | LITERAL | No |
| 3 | DOB | LITERAL | No |
| 4 | ADUPN | LITERAL | No |
| 5 | SECID | LITERAL | No |
| 6 | AUTHCODE | LITERAL | No |

**API Endpoint:** `GET /vista/xus/rpc/xus-iam-find-user`

---

### `XUS IAM DISPLAY USER`

| Property | Value |
|----------|-------|
| Tag | `IAMDU` |
| Routine | `XUESSO3` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** RPC ICE #6289 - API ICR #none This restricted RPC is used exclusively by the Identity and Access  Management (IAM) Provisioning application to display a VistA user.   The XUSHOWSSN Security Key is required to display Personally Identifiable Information (PII) such as Social Security Number (SSN) or D

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DISPDUZ | LITERAL | No |
| 2 | AUTHCODE | LITERAL | No |

**API Endpoint:** `GET /vista/xus/rpc/xus-iam-display-user`

---

### `XUS ESSO VALIDATE`

| Property | Value |
|----------|-------|
| Tag | `ESSO` |
| Routine | `XUESSO4` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** RPC ICR #6295 - API ICR #none This API/RPC uses the VA Identity and Access Management (IAM) SAML token definition version 1.2 attributes from a SAML token for user sign-on.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DOC | LITERAL | No |

**API Endpoint:** `GET /vista/xus/rpc/xus-esso-validate`

---

### `XUS IAM BIND USER`

| Property | Value |
|----------|-------|
| Tag | `IAMBU` |
| Routine | `XUESSO4` |
| Return Type | SINGLE VALUE |
| Parameter Count | 3 |
| Status | Inactive (may still be callable) |

**Description:** RPC ICR #6294 - API ICR #none This restricted RPC is used exclusively by the Identity and Access  Management (IAM) Binding application to set the Security ID (SecID) and  Active Directory UPN (ADUPN) in the VistA NEW PERSON file (#200) for Single Sign-On Internal (SSOi).

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SECID | LITERAL | No |
| 2 | AUTHCODE | LITERAL | No |
| 3 | ADUPN | LITERAL | No |

**API Endpoint:** `GET /vista/xus/rpc/xus-iam-bind-user`

---

### `XUS IAM TERMINATE USER`

| Property | Value |
|----------|-------|
| Tag | `IAMTU` |
| Routine | `XUESSO3` |
| Return Type | ARRAY |
| Parameter Count | 4 |
| Status | Inactive (may still be callable) |

**Description:** This restricted RPC is used exclusively by the Identity and Access  Management (IAM) Provisioning application to terminate an existing user  in the VistA NEW PERSON file (#200).

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SECID | LITERAL | No |
| 2 | TERMDATE | LITERAL | No |
| 3 | TERMRESN | LITERAL | No |
| 4 | AUTHCODE | LITERAL | No |

**API Endpoint:** `GET /vista/xus/rpc/xus-iam-terminate-user`

---

### `XUS IAM REACTIVATE USER`

| Property | Value |
|----------|-------|
| Tag | `IAMRU` |
| Routine | `XUESSO3` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** RPC ICR #6293 - API ICR #none This restricted RPC is used exclusively by the Identity and Access  Management (IAM) Provisioning application to reactivate an existing user  in the VistA NEW PERSON file (#200).

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SECID | LITERAL | No |
| 2 | AUTHCODE | LITERAL | No |

**API Endpoint:** `GET /vista/xus/rpc/xus-iam-reactivate-user`

---

### `XUS BSE TOKEN`

| Property | Value |
|----------|-------|
| Tag | `BSETOKEN` |
| Routine | `XUSBSE1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** RPC ICR #6695 - API ICR #none   This API/RPC returns a string from the current user authentication that  can be used to authenticate the user on a visited system. The application is identified by a security phrase that, when hashed, matches the stored hash of an authorized application in the REMOT

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | XPHRASE | LITERAL | No |

**API Endpoint:** `GET /vista/xus/rpc/xus-bse-token`

---

### `XUS MVI NEW PERSON GET`

| Property | Value |
|----------|-------|
| Tag | `GET` |
| Routine | `XUMVINPU` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 4 |
| Status | Inactive (may still be callable) |

**Description:** This restricted RPC is used exclusively by the Master Veteran Index (MVI)  to retrieve data (by DUZ, SECID, NPI or SSN) from the VistA NEW PERSON  file (#200).

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DUZ | LITERAL | No |
| 2 | SECID | LITERAL | No |
| 3 | NPI | LITERAL | No |
| 4 | SSN | LITERAL | No |

**API Endpoint:** `GET /vista/xus/rpc/xus-mvi-new-person-get`

---

### `XUS MVI NEW PERSON UPDATE`

| Property | Value |
|----------|-------|
| Tag | `UPDATE` |
| Routine | `XUMVINPU` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This restricted RPC is used exclusively by the Master Veteran Index (MVI)  to update an entry (by DUZ) in the VistA NEW PERSON file (#200).

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | XUARR | REFERENCE | No |

**API Endpoint:** `POST /vista/xus/rpc/xus-mvi-new-person-update`

---

### `XUS MVI NEW PERSON DATA`

| Property | Value |
|----------|-------|
| Tag | `EP` |
| Routine | `XUMVIDTA` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This RPC will return calculated data analysis from NEW PERSON file (#200)  at VistA for user's selection criteria for active and non active NEW  PERSON entries.   Active New Person aggregated data for one or all below elements: SECID AUDPN (Email) NT USERNAME

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SEL | LITERAL | No |
| 2 | ACTSEL | LITERAL | No |

**API Endpoint:** `GET /vista/xus/rpc/xus-mvi-new-person-data`

---

### `XUS MVI ENRICH NEW PERSON`

| Property | Value |
|----------|-------|
| Tag | `UPDATE` |
| Routine | `XUMVIENU` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This restricted RPC is used exclusively by the Master Veteran Index (MVI)  to update enriched data in the VistA New Person File (#200).

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PARAM | REFERENCE | No |
| 2 | FLAG | LITERAL | No |

**API Endpoint:** `GET /vista/xus/rpc/xus-mvi-enrich-new-person`

---

### `XUS MVI NEW PERSON BULK GET`

| Property | Value |
|----------|-------|
| Tag | `BULKGET` |
| Routine | `XUMVINPB` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This restricted RPC is used exclusively by the Master Veteran Index (MVI) to retrieve data in bulk from the VistA NEW PERSON file (#200).

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | XUDUZ | LITERAL | No |
| 2 | XUTYPE | LITERAL | No |

**API Endpoint:** `GET /vista/xus/rpc/xus-mvi-new-person-bulk-get`

---

### `XUS IS USER ACTIVE`

| Property | Value |
|----------|-------|
| Tag | `ACTIVE` |
| Routine | `XUESSO4` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This API/RPC is used to check if a user is active, as defined in the  routine APIs $$ACTIVE^XUSER.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | XUIEN | LITERAL | No |

**API Endpoint:** `GET /vista/xus/rpc/xus-is-user-active`

---

### `XUS MVI NEW PERSON RMTE AUDIT`

| Property | Value |
|----------|-------|
| Tag | `AUDIT` |
| Routine | `XURNPAUD` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This restricted RPC is used exclusively by the Master Veteran Index (MVI) to return audit data from the AUDIT (#1.1) file at a facility for a  specific user's record in the NEW PERSON (#200) file.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PARAM | REFERENCE | No |

**API Endpoint:** `GET /vista/xus/rpc/xus-mvi-new-person-rmte-audit`

---


## Roll & Scroll Prompt Mappings

These mappings show how traditional R&S terminal prompts correspond to RPC parameters and API fields.

| R&S Prompt | RPC | Parameter | Type | Source |
|------------|-----|-----------|------|--------|
| XWBUSRNM: | XUS SIGNON SETUP | XWBUSRNM | LITERAL | rpc |
| ASOSKIP: | XUS SIGNON SETUP | ASOSKIP | LITERAL | rpc |
| D20: | XUS SIGNON SETUP | D20 | LITERAL | rpc |
| AVCODE: | XUS AV CODE | AVCODE | LITERAL | rpc |
| KEY: | XUS KEY CHECK | KEY | REFERENCE | rpc |
| IEN: | XUS KEY CHECK | IEN | LITERAL | rpc |
| XU1: | XUS CVC | XU1 | LITERAL | rpc |
| DIV: | XUS DIVISION SET | DIV | LITERAL | rpc |
| IEN: | XUS DIVISION GET | IEN | LITERAL | rpc |
| CLIENT-IP: | XUS KAAJEE GET USER VIA PROXY | CLIENT-IP | LITERAL | rpc |
| SERVER-NM: | XUS KAAJEE GET USER VIA PROXY | SERVER-NM | LITERAL | rpc |
| CCOWTOK: | XUS KAAJEE GET USER VIA PROXY | CCOWTOK | LITERAL | rpc |
| IP-ADDRESS: | XUS KAAJEE GET CCOW TOKEN | IP-ADDRESS | LITERAL | rpc |
| IEN: | XUS ALLKEYS | IEN | LITERAL | rpc |
| FLAG: | XUS ALLKEYS | FLAG | LITERAL | rpc |
| TOKEN: | XUS GET VISITOR | TOKEN | LITERAL | rpc |
| CLIENT-IP: | XUS KAAJEE GET USER INFO | CLIENT-IP | LITERAL | rpc |
| SERVER-NM: | XUS KAAJEE GET USER INFO | SERVER-NM | LITERAL | rpc |
| SIGNON-LOG-DA: | XUS KAAJEE LOGOUT | SIGNON-LOG-DA | LITERAL | rpc |
| UPN: | XUS PKI SET UPN | UPN | LITERAL | rpc |
| NAME: | XUS IAM ADD USER | NAME | LITERAL | rpc |
| SECID: | XUS IAM ADD USER | SECID | LITERAL | rpc |
| EMAIL: | XUS IAM ADD USER | EMAIL | LITERAL | rpc |
| ADUPN: | XUS IAM ADD USER | ADUPN | LITERAL | rpc |
| SSN: | XUS IAM ADD USER | SSN | LITERAL | rpc |
| DOB: | XUS IAM ADD USER | DOB | LITERAL | rpc |
| STATION: | XUS IAM ADD USER | STATION | LITERAL | rpc |
| AUTHCODE: | XUS IAM ADD USER | AUTHCODE | LITERAL | rpc |
| INARRY: | XUS IAM EDIT USER | INARRY | REFERENCE | rpc |
| AUTHCODE: | XUS IAM EDIT USER | AUTHCODE | LITERAL | rpc |
| NAME: | XUS IAM FIND USER | NAME | LITERAL | rpc |
| SSN: | XUS IAM FIND USER | SSN | LITERAL | rpc |
| DOB: | XUS IAM FIND USER | DOB | LITERAL | rpc |
| ADUPN: | XUS IAM FIND USER | ADUPN | LITERAL | rpc |
| SECID: | XUS IAM FIND USER | SECID | LITERAL | rpc |
| AUTHCODE: | XUS IAM FIND USER | AUTHCODE | LITERAL | rpc |
| DISPDUZ: | XUS IAM DISPLAY USER | DISPDUZ | LITERAL | rpc |
| AUTHCODE: | XUS IAM DISPLAY USER | AUTHCODE | LITERAL | rpc |
| DOC: | XUS ESSO VALIDATE | DOC | LITERAL | rpc |
| SECID: | XUS IAM BIND USER | SECID | LITERAL | rpc |
| AUTHCODE: | XUS IAM BIND USER | AUTHCODE | LITERAL | rpc |
| ADUPN: | XUS IAM BIND USER | ADUPN | LITERAL | rpc |
| SECID: | XUS IAM TERMINATE USER | SECID | LITERAL | rpc |
| TERMDATE: | XUS IAM TERMINATE USER | TERMDATE | LITERAL | rpc |
| TERMRESN: | XUS IAM TERMINATE USER | TERMRESN | LITERAL | rpc |
| AUTHCODE: | XUS IAM TERMINATE USER | AUTHCODE | LITERAL | rpc |
| SECID: | XUS IAM REACTIVATE USER | SECID | LITERAL | rpc |
| AUTHCODE: | XUS IAM REACTIVATE USER | AUTHCODE | LITERAL | rpc |
| XPHRASE: | XUS BSE TOKEN | XPHRASE | LITERAL | rpc |
| DUZ: | XUS MVI NEW PERSON GET | DUZ | LITERAL | rpc |
| SECID: | XUS MVI NEW PERSON GET | SECID | LITERAL | rpc |
| NPI: | XUS MVI NEW PERSON GET | NPI | LITERAL | rpc |
| SSN: | XUS MVI NEW PERSON GET | SSN | LITERAL | rpc |
| XUARR: | XUS MVI NEW PERSON UPDATE | XUARR | REFERENCE | rpc |
| SEL: | XUS MVI NEW PERSON DATA | SEL | LITERAL | rpc |
| ACTSEL: | XUS MVI NEW PERSON DATA | ACTSEL | LITERAL | rpc |
| PARAM: | XUS MVI ENRICH NEW PERSON | PARAM | REFERENCE | rpc |
| FLAG: | XUS MVI ENRICH NEW PERSON | FLAG | LITERAL | rpc |
| XUDUZ: | XUS MVI NEW PERSON BULK GET | XUDUZ | LITERAL | rpc |
| XUTYPE: | XUS MVI NEW PERSON BULK GET | XUTYPE | LITERAL | rpc |
| XUIEN: | XUS IS USER ACTIVE | XUIEN | LITERAL | rpc |
| PARAM: | XUS MVI NEW PERSON RMTE AUDIT | PARAM | REFERENCE | rpc |
| XWBUSRNM: | XUS SIGNON SETUP | XWBUSRNM | LITERAL | rpc |
| ASOSKIP: | XUS SIGNON SETUP | ASOSKIP | LITERAL | rpc |
| D20: | XUS SIGNON SETUP | D20 | LITERAL | rpc |
| AVCODE: | XUS AV CODE | AVCODE | LITERAL | rpc |
| KEY: | XUS KEY CHECK | KEY | REFERENCE | rpc |
| IEN: | XUS KEY CHECK | IEN | LITERAL | rpc |
| XU1: | XUS CVC | XU1 | LITERAL | rpc |
| DIV: | XUS DIVISION SET | DIV | LITERAL | rpc |
| IEN: | XUS DIVISION GET | IEN | LITERAL | rpc |
| CLIENT-IP: | XUS KAAJEE GET USER VIA PROXY | CLIENT-IP | LITERAL | rpc |
| SERVER-NM: | XUS KAAJEE GET USER VIA PROXY | SERVER-NM | LITERAL | rpc |
| CCOWTOK: | XUS KAAJEE GET USER VIA PROXY | CCOWTOK | LITERAL | rpc |
| IP-ADDRESS: | XUS KAAJEE GET CCOW TOKEN | IP-ADDRESS | LITERAL | rpc |
| IEN: | XUS ALLKEYS | IEN | LITERAL | rpc |
| FLAG: | XUS ALLKEYS | FLAG | LITERAL | rpc |
| XUPSLNAM: | XUPS PERSONQUERY | XUPSLNAM | LITERAL | rpc |
| XUPSFNAM: | XUPS PERSONQUERY | XUPSFNAM | LITERAL | rpc |
| XUPSSSN: | XUPS PERSONQUERY | XUPSSSN | LITERAL | rpc |
| XUPSPROV: | XUPS PERSONQUERY | XUPSPROV | LITERAL | rpc |
| XUPSSTN: | XUPS PERSONQUERY | XUPSSTN | LITERAL | rpc |
| XUPSMNM: | XUPS PERSONQUERY | XUPSMNM | LITERAL | rpc |
| XUPSDATE: | XUPS PERSONQUERY | XUPSDATE | LITERAL | rpc |
| XUPSVPID: | XUPS PERSONQUERY | XUPSVPID | LITERAL | rpc |
| TOKEN: | XUS GET VISITOR | TOKEN | LITERAL | rpc |
| CLIENT-IP: | XUS KAAJEE GET USER INFO | CLIENT-IP | LITERAL | rpc |
| SERVER-NM: | XUS KAAJEE GET USER INFO | SERVER-NM | LITERAL | rpc |
| SIGNON-LOG-DA: | XUS KAAJEE LOGOUT | SIGNON-LOG-DA | LITERAL | rpc |
| UPN: | XUS PKI SET UPN | UPN | LITERAL | rpc |
| DATA: | XU EPCS EDIT | DATA | REFERENCE | rpc |
| NAME: | XUS IAM ADD USER | NAME | LITERAL | rpc |
| SECID: | XUS IAM ADD USER | SECID | LITERAL | rpc |
| EMAIL: | XUS IAM ADD USER | EMAIL | LITERAL | rpc |
| ADUPN: | XUS IAM ADD USER | ADUPN | LITERAL | rpc |
| SSN: | XUS IAM ADD USER | SSN | LITERAL | rpc |
| DOB: | XUS IAM ADD USER | DOB | LITERAL | rpc |
| STATION: | XUS IAM ADD USER | STATION | LITERAL | rpc |
| AUTHCODE: | XUS IAM ADD USER | AUTHCODE | LITERAL | rpc |
| INARRY: | XUS IAM EDIT USER | INARRY | REFERENCE | rpc |
| AUTHCODE: | XUS IAM EDIT USER | AUTHCODE | LITERAL | rpc |
| NAME: | XUS IAM FIND USER | NAME | LITERAL | rpc |
| SSN: | XUS IAM FIND USER | SSN | LITERAL | rpc |
| DOB: | XUS IAM FIND USER | DOB | LITERAL | rpc |
| ADUPN: | XUS IAM FIND USER | ADUPN | LITERAL | rpc |
| SECID: | XUS IAM FIND USER | SECID | LITERAL | rpc |
| AUTHCODE: | XUS IAM FIND USER | AUTHCODE | LITERAL | rpc |
| DISPDUZ: | XUS IAM DISPLAY USER | DISPDUZ | LITERAL | rpc |
| AUTHCODE: | XUS IAM DISPLAY USER | AUTHCODE | LITERAL | rpc |
| DOC: | XUS ESSO VALIDATE | DOC | LITERAL | rpc |
| SECID: | XUS IAM BIND USER | SECID | LITERAL | rpc |
| AUTHCODE: | XUS IAM BIND USER | AUTHCODE | LITERAL | rpc |
| ADUPN: | XUS IAM BIND USER | ADUPN | LITERAL | rpc |
| SECID: | XUS IAM TERMINATE USER | SECID | LITERAL | rpc |
| TERMDATE: | XUS IAM TERMINATE USER | TERMDATE | LITERAL | rpc |
| TERMRESN: | XUS IAM TERMINATE USER | TERMRESN | LITERAL | rpc |
| AUTHCODE: | XUS IAM TERMINATE USER | AUTHCODE | LITERAL | rpc |
| SECID: | XUS IAM REACTIVATE USER | SECID | LITERAL | rpc |
| AUTHCODE: | XUS IAM REACTIVATE USER | AUTHCODE | LITERAL | rpc |
| XPHRASE: | XUS BSE TOKEN | XPHRASE | LITERAL | rpc |
| USER: | MPI VISTA HWS CONFIG | USER | LITERAL | rpc |
| PASS: | MPI VISTA HWS CONFIG | PASS | LITERAL | rpc |
| SWITCH: | MPI VISTA HWS CONFIG | SWITCH | LITERAL | rpc |
| SERVER: | MPI VISTA HWS CONFIG | SERVER | LITERAL | rpc |
| SSL PORT: | MPI VISTA HWS CONFIG | SSL PORT | LITERAL | rpc |
| SSL CONFIGURATION: | MPI VISTA HWS CONFIG | SSL CONFIGURATION | LITERAL | rpc |
| DUZ: | XUS MVI NEW PERSON GET | DUZ | LITERAL | rpc |
| SECID: | XUS MVI NEW PERSON GET | SECID | LITERAL | rpc |
| NPI: | XUS MVI NEW PERSON GET | NPI | LITERAL | rpc |
| SSN: | XUS MVI NEW PERSON GET | SSN | LITERAL | rpc |
| XUARR: | XUS MVI NEW PERSON UPDATE | XUARR | REFERENCE | rpc |
| SEL: | XUS MVI NEW PERSON DATA | SEL | LITERAL | rpc |
| ACTSEL: | XUS MVI NEW PERSON DATA | ACTSEL | LITERAL | rpc |
| PARAM: | XUS MVI ENRICH NEW PERSON | PARAM | REFERENCE | rpc |
| FLAG: | XUS MVI ENRICH NEW PERSON | FLAG | LITERAL | rpc |
| XUDUZ: | XUS MVI NEW PERSON BULK GET | XUDUZ | LITERAL | rpc |
| XUTYPE: | XUS MVI NEW PERSON BULK GET | XUTYPE | LITERAL | rpc |
| LOCKGBL: | XULM GET LOCK TABLE | LOCKGBL | LITERAL | rpc |
| RESULT: | XULM GET LOCK TABLE | RESULT | LITERAL | rpc |
| PID: | XULM KILL PROCESS | PID | LITERAL | rpc |
| RETURN: | XULM KILL PROCESS | RETURN | LITERAL | rpc |
| XUIEN: | XUS IS USER ACTIVE | XUIEN | LITERAL | rpc |
| PARAM: | XUS MVI NEW PERSON RMTE AUDIT | PARAM | REFERENCE | rpc |

## Menu Options

### Broker

| Name | Security Key |
|------|-------------|
| XUS SIGNON | — |
| XUS KAAJEE WEB LOGON | — |
| XUS KAAJEE PROXY LOGON | — |
| XUS IAM USER PROVISIONING | — |
| XUS IAM USER BINDING | — |

### Action

| Name | Security Key |
|------|-------------|
| XUS NPI SIGNON CHECK | — |
| XUS IAM USER TERMINATE | — |

### Run routine

| Name | Security Key |
|------|-------------|
| XUS NPI CBO LIST | — |
| XUS NPI LOCAL REPORTS | — |
| XUS NPI ENTER NPI FOR PROVIDER | — |
| XUS NPI EXEMPT PROVIDER | — |
| XUS NPI PROVIDER SELF ENTRY | — |
| XUS NPI EXTRACT | — |
| XUS IAM NPFM BATCH UPDATE | — |
| XUS IAM NPFM PURGE | — |

### Menu

| Name | Security Key |
|------|-------------|
| XUS NPI MENU | XUSNPIMTL |

### Print

| Name | Security Key |
|------|-------------|
| XUS VISIT USERS | — |

## Security Keys

These VistA security keys control access to specific functions within this module:

- `XUSNPIMTL`

## API Route Summary

All routes are prefixed with `/vista/xus/`.

| Method | Endpoint | RPC | Return Type |
|--------|----------|-----|-------------|
| GET | `/vista/xus/rpc/xus-signon-setup` | XUS SIGNON SETUP | ARRAY |
| GET | `/vista/xus/rpc/xus-send-keys` | XUS SEND KEYS | ARRAY |
| GET | `/vista/xus/rpc/xus-av-code` | XUS AV CODE | ARRAY |
| GET | `/vista/xus/rpc/xus-intro-msg` | XUS INTRO MSG | WORD PROCESSING |
| GET | `/vista/xus/rpc/xus-key-check` | XUS KEY CHECK | ARRAY |
| GET | `/vista/xus/rpc/xus-cvc` | XUS CVC | ARRAY |
| GET | `/vista/xus/rpc/xus-av-help` | XUS AV HELP | ARRAY |
| POST | `/vista/xus/rpc/xus-division-set` | XUS DIVISION SET | SINGLE VALUE |
| GET | `/vista/xus/rpc/xus-get-user-info` | XUS GET USER INFO | ARRAY |
| GET | `/vista/xus/rpc/xus-division-get` | XUS DIVISION GET | ARRAY |
| GET | `/vista/xus/rpc/xus-kaajee-get-user-via-proxy` | XUS KAAJEE GET USER VIA PROXY | ARRAY |
| GET | `/vista/xus/rpc/xus-kaajee-get-ccow-token` | XUS KAAJEE GET CCOW TOKEN | ARRAY |
| GET | `/vista/xus/rpc/xus-get-token` | XUS GET TOKEN | SINGLE VALUE |
| GET | `/vista/xus/rpc/xus-ccow-vault-param` | XUS CCOW VAULT PARAM | ARRAY |
| GET | `/vista/xus/rpc/xus-get-ccow-token` | XUS GET CCOW TOKEN | ARRAY |
| GET | `/vista/xus/rpc/xus-allkeys` | XUS ALLKEYS | GLOBAL ARRAY |
| POST | `/vista/xus/rpc/xus-set-visitor` | XUS SET VISITOR | SINGLE VALUE |
| GET | `/vista/xus/rpc/xus-get-visitor` | XUS GET VISITOR | SINGLE VALUE |
| GET | `/vista/xus/rpc/xus-kaajee-get-user-info` | XUS KAAJEE GET USER INFO | ARRAY |
| GET | `/vista/xus/rpc/xus-kaajee-logout` | XUS KAAJEE LOGOUT | SINGLE VALUE |
| GET | `/vista/xus/rpc/xus-pki-get-upn` | XUS PKI GET UPN | SINGLE VALUE |
| POST | `/vista/xus/rpc/xus-pki-set-upn` | XUS PKI SET UPN | SINGLE VALUE |
| POST | `/vista/xus/rpc/xus-iam-add-user` | XUS IAM ADD USER | ARRAY |
| GET | `/vista/xus/rpc/xus-iam-edit-user` | XUS IAM EDIT USER | ARRAY |
| GET | `/vista/xus/rpc/xus-iam-find-user` | XUS IAM FIND USER | ARRAY |
| GET | `/vista/xus/rpc/xus-iam-display-user` | XUS IAM DISPLAY USER | ARRAY |
| GET | `/vista/xus/rpc/xus-esso-validate` | XUS ESSO VALIDATE | ARRAY |
| GET | `/vista/xus/rpc/xus-iam-bind-user` | XUS IAM BIND USER | SINGLE VALUE |
| GET | `/vista/xus/rpc/xus-iam-terminate-user` | XUS IAM TERMINATE USER | ARRAY |
| GET | `/vista/xus/rpc/xus-iam-reactivate-user` | XUS IAM REACTIVATE USER | ARRAY |
| GET | `/vista/xus/rpc/xus-bse-token` | XUS BSE TOKEN | SINGLE VALUE |
| GET | `/vista/xus/rpc/xus-mvi-new-person-get` | XUS MVI NEW PERSON GET | GLOBAL ARRAY |
| POST | `/vista/xus/rpc/xus-mvi-new-person-update` | XUS MVI NEW PERSON UPDATE | SINGLE VALUE |
| GET | `/vista/xus/rpc/xus-mvi-new-person-data` | XUS MVI NEW PERSON DATA | SINGLE VALUE |
| GET | `/vista/xus/rpc/xus-mvi-enrich-new-person` | XUS MVI ENRICH NEW PERSON | SINGLE VALUE |
| GET | `/vista/xus/rpc/xus-mvi-new-person-bulk-get` | XUS MVI NEW PERSON BULK GET | GLOBAL ARRAY |
| GET | `/vista/xus/rpc/xus-is-user-active` | XUS IS USER ACTIVE | SINGLE VALUE |
| GET | `/vista/xus/rpc/xus-mvi-new-person-rmte-audit` | XUS MVI NEW PERSON RMTE AUDIT | GLOBAL ARRAY |

## VDL Documentation Reference

Source manual: `data/vista/vdl-manuals/kernel-technical-manual.pdf`

Refer to the official VA VistA Documentation Library (VDL) manual for:

- Roll & Scroll terminal operation procedures
- Security key assignments and menu management
- FileMan file relationships and data entry rules
- MUMPS routine reference and entry points
