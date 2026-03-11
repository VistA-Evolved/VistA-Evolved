# Prosthetics (RMPR)

> Auto-generated module documentation by vista-module-gen
> Source: VA VistA Roll & Scroll documentation, RPC catalog (File 8994), FileMan data dictionary

## Overview

| Property | Value |
|----------|-------|
| Namespace | `RMPR` |
| Tier | 5 |
| FileMan Files | 0 |
| RPCs | 58 |
| Menu Options | 195 |

## FileMan Files

No FileMan file metadata available for this package.

## Remote Procedure Calls (RPCs)

### `RMPR NPPD LIST`

| Property | Value |
|----------|-------|
| Tag | `EN` |
| Routine | `RMPR9LNP` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** GUI REMOTE PROCEDURE, LIST NPPD DATA           ;RESULTS passed to broker in ^TMP($J,         ;delimited by "^"         ;piece 1 = ENTRY DATE         ;piece 2 = PATIENT NAME         ;piece 3 = PSAS HCPCS with * if hcpcs has Calculation Flag         ;piece 4 = QTY         ;piece 5 = VENDOR         ;pi

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DATE1 | LITERAL | No |
| 2 | DATE2 | LITERAL | No |

**API Endpoint:** `GET /vista/rmpr/rpc/rmpr-nppd-list`

---

### `RMPR TRANS LIST`

| Property | Value |
|----------|-------|
| Tag | `EN` |
| Routine | `RMPR9S4` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** GUI 2319 Appliance Transaction List Tab 4.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | IEN | LITERAL | No |

**API Endpoint:** `GET /vista/rmpr/rpc/rmpr-trans-list`

---

### `RMPR PT DEM`

| Property | Value |
|----------|-------|
| Tag | `EN` |
| Routine | `RMPR9DEM` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** This procedure supplies the Patient Demographic data for  TAB 1 of the GUI 2319  Same routine for RMPR PT ADD REMOTE PROCEDURE.  Pass the IEN of file 668   RESULTS COME FROM THE PIMS PACKAGE PATIENT FILE #2.   RESULTS(1)=NAME RESULTS(2)=SSN   RESULTS(3)=DOB RESULTS(4)=AGE RESULTS(5)=SEX RESULTS(6)=D

**API Endpoint:** `GET /vista/rmpr/rpc/rmpr-pt-dem`

---

### `RMPR PT ADD`

| Property | Value |
|----------|-------|
| Tag | `EN1` |
| Routine | `RMPR9DEM` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** GUI 2319 Patient Demographics Tab 1.   Same routine for RMPR PT DEM REMOTE PROCEDURE.  Pass the IEN of file 668   RESULTS COME FROM THE PIMS PACKAGE PATIENT FILE #2.   RESULTS(1)=NAME RESULTS(2)=SSN   RESULTS(3)=DOB RESULTS(4)=AGE RESULTS(5)=SEX RESULTS(6)=DOD RESULTS(7)=RACE RESULTS(8)=RELIGION RES

**API Endpoint:** `POST /vista/rmpr/rpc/rmpr-pt-add`

---

### `RMPR TRANS HISA`

| Property | Value |
|----------|-------|
| Tag | `EN` |
| Routine | `RMPR9S7` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** GUI 2319 HISA information Tab 7.   PASS IEN OF FILE 668.   RETURNED RESUTLS

**API Endpoint:** `GET /vista/rmpr/rpc/rmpr-trans-hisa`

---

### `RMPR TRANS HOME O2`

| Property | Value |
|----------|-------|
| Tag | `EN` |
| Routine | `RMPR9S8` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** GUI 2319 Home Oxygen tab 8.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | IEN | LITERAL | No |

**API Endpoint:** `GET /vista/rmpr/rpc/rmpr-trans-home-o2`

---

### `RMPR CRITICAL COM`

| Property | Value |
|----------|-------|
| Tag | `EN` |
| Routine | `RMPR9S6` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** GUI 2319 Critical Comment Tab 6.   PASS IEN OF FILE 668   RETURN RESULTS ARRAY FROM FILE 665 CRITICAL COMMENTS FIELD.   RESUTLS()=ONE LINE AT A TIME OF THE WORD PROCESSING FIELD. ONE LINE TO  INFINITE.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | IEN | LITERAL | No |

**API Endpoint:** `GET /vista/rmpr/rpc/rmpr-critical-com`

---

### `RMPR DIS LIST`

| Property | Value |
|----------|-------|
| Tag | `EN` |
| Routine | `RMPR9DM1` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** GUI 2319 MAS DISABILITY AND PERCENT.   PASS IEN OF FILE 668.   RETURN RESULTS FROM FILE #2.   RESULTS()=DISABILITY DESCRIPTION^%^SC YESorNO. One line or multiple lines.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | IEN | LITERAL | No |

**API Endpoint:** `GET /vista/rmpr/rpc/rmpr-dis-list`

---

### `RMPR ADD ITEM`

| Property | Value |
|----------|-------|
| Tag | `EN` |
| Routine | `RMPR9AI` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** RPC to send purchasing information to file 666 GUI PURCHASING FILE.

**API Endpoint:** `POST /vista/rmpr/rpc/rmpr-add-item`

---

### `RMPR LAST PT MOVEMENTS`

| Property | Value |
|----------|-------|
| Tag | `EN` |
| Routine | `RMPR9LM` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This procedure supplies the data for the Last 2 inpatient movements for  TAB 2 of the GUI 2319. Pass IEN to Prosthetic Suspense (#668)   Return RESULTS Array and Example:   RESULTS(0)=Name RESULTS(1)=SSN RESULTS(2)=DOB RESULTS(3)=Claim # RESULTS(4)= if 1 Yes a movement RESULTS(5)=Transaction type RE

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | IEN | LITERAL | No |

**API Endpoint:** `GET /vista/rmpr/rpc/rmpr-last-pt-movements`

---

### `RMPR VEN ADDRESS`

| Property | Value |
|----------|-------|
| Tag | `EN1` |
| Routine | `RMPR9AI` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Dispaly vendor address, phone and fax number

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | IEN | LITERAL | No |

**API Endpoint:** `GET /vista/rmpr/rpc/rmpr-ven-address`

---

### `RMPR CLINIC ENROLLMENT`

| Property | Value |
|----------|-------|
| Tag | `EN` |
| Routine | `RMPR9CE` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This procedure supplies the Clinic Enrollment data for  TAB 2 of the GUI 2319.   Example of RESULTS    RESULTS(0)=CLINIC RESULTS(1)=DATE ENROLLED RESULTS(2)=OPT OR AC RESULTS(3)=STARTS OVER WITH NEXT CLINIC

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | IEN | LITERAL | No |

**API Endpoint:** `GET /vista/rmpr/rpc/rmpr-clinic-enrollment`

---

### `RMPR CPRS DISPLAY`

| Property | Value |
|----------|-------|
| Tag | `EN` |
| Routine | `RMPR9EPD` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** GUI CPRS SUSPENSE DETAIL DISPLAY.   PASS THE IEN OF FILE 668   RETURN RESULTS:  RESUTLS()=^TMP("GMRCR",

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | IEN | LITERAL | No |

**API Endpoint:** `GET /vista/rmpr/rpc/rmpr-cprs-display`

---

### `RMPR CLINIC LETTER LIST`

| Property | Value |
|----------|-------|
| Tag | `EN` |
| Routine | `RMPR9CL` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This procedure supplies the Clinic Letter List data for  TAB 2 of the GUI 2319.   Pass IEN to Prosthetic Suspense (#668)   Return RESULTS Array IEN of file 665.4^Patient Name^Letter Title^Author^Date Created

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | IEN | LITERAL | No |

**API Endpoint:** `GET /vista/rmpr/rpc/rmpr-clinic-letter-list`

---

### `RMPR PENDING APPOINTMENTS`

| Property | Value |
|----------|-------|
| Tag | `EN` |
| Routine | `RMPR9PA` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This procedure supplies the Pending Appointment data for  TAB 2 of the GUI 2319.   Pass IEN to Prosthetic Suspense (#668)   Returned  RESULTS Array: RESULTS(0)=DATE/TIME^CLINIC^STATUS^TYPE

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | IEN | LITERAL | No |

**API Endpoint:** `GET /vista/rmpr/rpc/rmpr-pending-appointments`

---

### `RMPR IFCAP CHECK AUTH`

| Property | Value |
|----------|-------|
| Tag | `EN1` |
| Routine | `RMPR9SPC` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** Check if user has any Purchase Cards Assigened.   RESULTS(0)=You are not an authorized Purchase Card User, CONTACT FISCAL! Or RESULTS(0)=You are not defined in the Prosthetics Site Parameter File. Or RESULTS(0)=9 Ien to file 669.9   New X-ref in file 669.9 on Purchasing Agent Field.  Set with rout

**API Endpoint:** `GET /vista/rmpr/rpc/rmpr-ifcap-check-auth`

---

### `RMPR CLINIC LETTER DISPLAY`

| Property | Value |
|----------|-------|
| Tag | `EN1` |
| Routine | `RMPR9CL` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This procedure supplies the Clinic Letter Display data for  TAB 2 of the GUI 2319.   Pass IEN to Prosthetic Suspense (#665.4)   Return RESULTS Array One line of the letter at a time from word processsing fields. The number of lines will vary.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | IEN | LITERAL | No |

**API Endpoint:** `GET /vista/rmpr/rpc/rmpr-clinic-letter-display`

---

### `RMPR TRANS LIST EXPANDED`

| Property | Value |
|----------|-------|
| Tag | `EN` |
| Routine | `RMPR9S4E` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** GUI 2319 Expansion of Screen 4 Transaction list.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | IEN | LITERAL | No |
| 2 | IEN | UNKNOWN() | No |

**API Endpoint:** `GET /vista/rmpr/rpc/rmpr-trans-list-expanded`

---

### `RMPR TRANS HOME O2 RX`

| Property | Value |
|----------|-------|
| Tag | `EN` |
| Routine | `RMPR9S8P` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** RX information for screen 8 of the GUI 2319 Home Oxygen.   Pass: IEN of File 660  RESULTS(0)=THE NUMBER OF PRESCRIPTIONS RESULTS(1)=DATE PRESCRIPTION WRITTEN RESULTS(2)=DATE PRESCRIPTION EXPIRES

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | IEN | LITERAL | No |

**API Endpoint:** `GET /vista/rmpr/rpc/rmpr-trans-home-o2-rx`

---

### `RMPR VIEW REQ`

| Property | Value |
|----------|-------|
| Tag | `EN` |
| Routine | `RMPR9VR` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This procedure supplies the View Request screen of file 668.   Entry Point:   EN(RESULTS,RMPRA)^RMPR9VR   RESULTS(0)= Order date/Suspense date RESULTS(1)= Requestor RESULTS(2)= Suspended by RESULTS(3)= Initial Action Date RESULTS(4)= Completion Date

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | IEN | LITERAL | No |

**API Endpoint:** `GET /vista/rmpr/rpc/rmpr-view-req`

---

### `RMPR VIEW REQ DESC`

| Property | Value |
|----------|-------|
| Tag | `EN2` |
| Routine | `RMPR9VR` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This procedure supplies the View Request Description display of file #668. Entry Point:  EN2(RESULTS,RMPRA)^RMPR9VR   RESULTS Array:  Word processing fields 0-infinite lines. .

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | IEN | LITERAL | No |

**API Endpoint:** `GET /vista/rmpr/rpc/rmpr-view-req-desc`

---

### `RMPR VIEW REQ IA NOTE`

| Property | Value |
|----------|-------|
| Tag | `EN3` |
| Routine | `RMPR9VR` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This procedure supplies the View Request Initial Action Note display of  file #668. Entry Point:  EN3(RESULTS,RMPRA)^RMPR9VR   RESULTS Array:  Word processing fields 0-infinite lines.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | IEN | LITERAL | No |

**API Endpoint:** `GET /vista/rmpr/rpc/rmpr-view-req-ia-note`

---

### `RMPR VIEW REQ COMP NOTE`

| Property | Value |
|----------|-------|
| Tag | `EN4` |
| Routine | `RMPR9VR` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This procedure supplies the View Request Completion Note of file #668. . Entry Point:  EN4(RESULTS,RMPRA)^RMPR9VR   RESULTS Array:  Word processing fields 0-infinite lines.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | IEN | LITERAL | No |

**API Endpoint:** `GET /vista/rmpr/rpc/rmpr-view-req-comp-note`

---

### `RMPR DOR`

| Property | Value |
|----------|-------|
| Tag | `EN` |
| Routine | `RMPR9DO` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** GUI Order controll processing.  Returns the list of all open pending  consults from file 668.

**API Endpoint:** `GET /vista/rmpr/rpc/rmpr-dor`

---

### `RMPR PFFS LIST`

| Property | Value |
|----------|-------|
| Tag | `EN` |
| Routine | `RMPRPFFS` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** GUI REMOTE PROCEDURE, LIST NPPD DATA           ;RESULTS passed to broker in ^TMP($J,         ;delimited by "^"         ;piece 1 = ENTRY DATE         ;piece 2 = PATIENT NAME         ;piece 3 = PSAS HCPCS with * if hcpcs has Calculation Flag         ;piece 4 = QTY         ;piece 5 = VENDOR         ;pi

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DATE1 | LITERAL | No |
| 2 | DATE2 | LITERAL | No |

**API Endpoint:** `GET /vista/rmpr/rpc/rmpr-pffs-list`

---

### `RMPR DIS LIST 660`

| Property | Value |
|----------|-------|
| Tag | `EN` |
| Routine | `RMPR9DM2` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** GUI 2319 MAS DISABILITY AND PERCENT.   PASS IEN OF FILE 660.   RETURN RESULTS FROM FILE #2.   RESULTS()=DISABILITY DESCRIPTION^%^SC YESorNO. One line or multiple lines.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | IEN | LITERAL | No |

**API Endpoint:** `GET /vista/rmpr/rpc/rmpr-dis-list-660`

---

### `RMPR PFFS INS`

| Property | Value |
|----------|-------|
| Tag | `EN` |
| Routine | `RMPR9DM3` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** ;RESULTS passed to broker          ;delimited by "^"          ;piece 1 = INSURANCE COMPANY          ;piece 2 = SUB ID          ;piece 3 = GROUP          ;piece 4 = HOLDER          ;piece 5 = EXPIRATION DATE          ;piece 6 = EFFECTIVE DATE          ;piece 7 = COB

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | IEN | LITERAL | No |

**API Endpoint:** `GET /vista/rmpr/rpc/rmpr-pffs-ins`

---

### `RMPR OPEN PEN LIST`

| Property | Value |
|----------|-------|
| Tag | `EN` |
| Routine | `RMPR9LST` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** T his procedure retrieves the list of the main purchasing grid, file (3668). No Input Parameters besides SITE needed.

**API Endpoint:** `GET /vista/rmpr/rpc/rmpr-open-pen-list`

---

### `RMPR LIST PCARD`

| Property | Value |
|----------|-------|
| Tag | `ENA` |
| Routine | `RMPR9AUT` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** RPC to pass all the credit card numbers of a user.  Only credit card numers that belong to a user or surrogate user will be passed by this rpc. number that belongs to a user or surrogate user will be passed by this RPC.

**API Endpoint:** `GET /vista/rmpr/rpc/rmpr-list-pcard`

---

### `RMPR CREATE PO`

| Property | Value |
|----------|-------|
| Tag | `ENB` |
| Routine | `RMPR9AUT` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** RPC call to get the next Common Numbering Series from 442.6

**API Endpoint:** `POST /vista/rmpr/rpc/rmpr-create-po`

---

### `RMPR LIST COST CENTER`

| Property | Value |
|----------|-------|
| Tag | `END` |
| Routine | `RMPR9AUT` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** RPC to list all available Cost Center(s) for a given fud control point.

**API Endpoint:** `GET /vista/rmpr/rpc/rmpr-list-cost-center`

---

### `RMPR LIST BOC`

| Property | Value |
|----------|-------|
| Tag | `ENE` |
| Routine | `RMPR9AUT` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** RPC to list all available Budget Object Code (BOC)'s for a given Cost Center

**API Endpoint:** `GET /vista/rmpr/rpc/rmpr-list-boc`

---

### `RMPR CHECK PA AUTHORIZATION`

| Property | Value |
|----------|-------|
| Tag | `EN1` |
| Routine | `RMPR9PCD` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** 

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | IEN | LITERAL | No |

**API Endpoint:** `GET /vista/rmpr/rpc/rmpr-check-pa-authorization`

---

### `RMPR SUSPENSE ACTIONS`

| Property | Value |
|----------|-------|
| Tag | `EN` |
| Routine | `RMPR9CA` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Remote Procedure for Purchasing Actions.  The firs 2 will be: Post complete note Post initial action

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | RMPRTXT | REFERENCE | No |

**API Endpoint:** `GET /vista/rmpr/rpc/rmpr-suspense-actions`

---

### `RMPR SEND PURCHASE ORDER`

| Property | Value |
|----------|-------|
| Tag | `GUI` |
| Routine | `RMPR121B` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** This will pass the array from Kernel Broker to CoreFLS to create a Patient po.  After checking for E-Sig.

**API Endpoint:** `GET /vista/rmpr/rpc/rmpr-send-purchase-order`

---

### `RMPR PO CREATE VISTA IEN`

| Property | Value |
|----------|-------|
| Tag | `EN1` |
| Routine | `RMPR9CS` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This will pass the array from Kernel Broker to create Patient 2319. Return will be Line Number^Vista IEN^Grouper Number.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | OUT | REFERENCE | No |

**API Endpoint:** `POST /vista/rmpr/rpc/rmpr-po-create-vista-ien`

---

### `RMPR ENCRYPT PCARD`

| Property | Value |
|----------|-------|
| Tag | `EN` |
| Routine | `RMPR9ENC` |
| Return Type | ARRAY |
| Parameter Count | 3 |
| Status | Inactive (may still be callable) |

**Description:** Remote Procedure to update the PROSTHETICS 1358 file #664 with the  encrypted PCARD.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | RMPRPCD | LITERAL | No |
| 2 | DUZ | LITERAL | No |
| 3 | RMPRA | LITERAL | No |

**API Endpoint:** `GET /vista/rmpr/rpc/rmpr-encrypt-pcard`

---

### `RMPR MANAGER COMMENT`

| Property | Value |
|----------|-------|
| Tag | `MGR` |
| Routine | `RMPRESI` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** RPC call to get the Manager Comment from file 669.9.

**API Endpoint:** `GET /vista/rmpr/rpc/rmpr-manager-comment`

---

### `RMPR DELETE PO`

| Property | Value |
|----------|-------|
| Tag | `EN1` |
| Routine | `RMPR9CA` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** RPC to delete record in file 664.

**API Endpoint:** `POST /vista/rmpr/rpc/rmpr-delete-po`

---

### `RMPR NPPD LIST X`

| Property | Value |
|----------|-------|
| Tag | `EN` |
| Routine | `RMPR9LN1` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** GUI REMOTE PROCEDURE, LIST NPPD DATA           ;RESULTS passed to broker in ^TMP($J,         ;delimited by "^"         ;piece 1 = DATA TO DISPLAY         ;piece 2 = FIELD NUMBER

**API Endpoint:** `GET /vista/rmpr/rpc/rmpr-nppd-list-x`

---

### `RMPR CHECK FUND CONTROL POINT`

| Property | Value |
|----------|-------|
| Tag | `END` |
| Routine | `PRCH7PA4` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** RPC to check user authorization for a Fund Control Point

**API Endpoint:** `GET /vista/rmpr/rpc/rmpr-check-fund-control-point`

---

### `RMPR PC PO PRINT`

| Property | Value |
|----------|-------|
| Tag | `PRT` |
| Routine | `RMPR9P21` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** Purchase Order Information to be printed from a PC Device Fax/Printer

**API Endpoint:** `GET /vista/rmpr/rpc/rmpr-pc-po-print`

---

### `RMPR CHECK PROS PATIENT`

| Property | Value |
|----------|-------|
| Tag | `EN1` |
| Routine | `RMPR9CPP` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** 

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | IEN | LITERAL | No |

**API Endpoint:** `GET /vista/rmpr/rpc/rmpr-check-pros-patient`

---

### `RMPR CREATE WORK ORDER`

| Property | Value |
|----------|-------|
| Tag | `CR` |
| Routine | `RMPR29GU` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** 

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | RMPR9DA | LITERAL | No |
| 2 | SCR | LITERAL | No |

**API Endpoint:** `POST /vista/rmpr/rpc/rmpr-create-work-order`

---

### `RMPR OWL SUSPENSE ACTIONS`

| Property | Value |
|----------|-------|
| Tag | `EN` |
| Routine | `RMPR29CA` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Remote Procedure  for Work Order Actions.  The first 2 will be: Post complete note Post initial action

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | RMPRTXT | REFERENCE | No |

**API Endpoint:** `GET /vista/rmpr/rpc/rmpr-owl-suspense-actions`

---

### `RMPR OWL WORK ORDER LIST`

| Property | Value |
|----------|-------|
| Tag | `EN` |
| Routine | `RMPR29WO` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** GUI Order controll processing.  Returns the list of all open pending  Work Orders from file 664.1.

**API Endpoint:** `GET /vista/rmpr/rpc/rmpr-owl-work-order-list`

---

### `RMPR OWL PC PRINT`

| Property | Value |
|----------|-------|
| Tag | `PRT` |
| Routine | `RMPR29RG` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** Purchase Order Information to be printed from a PC Device Fax/Printer

**API Endpoint:** `GET /vista/rmpr/rpc/rmpr-owl-pc-print`

---

### `RMPR OWL ITEM LIST`

| Property | Value |
|----------|-------|
| Tag | `EN` |
| Routine | `RMPR29W1` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** GUI Order controll processing.  Returns the list of all open pending  Work Orders from file 664.1.

**API Endpoint:** `GET /vista/rmpr/rpc/rmpr-owl-item-list`

---

### `RMPR PURCHASE ORDER CONTROL`

| Property | Value |
|----------|-------|
| Tag | `EN` |
| Routine | `RMPR9PU` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** GUI Order controll processing.  Returns the list of all open pending  consults from file 668.

**API Endpoint:** `GET /vista/rmpr/rpc/rmpr-purchase-order-control`

---

### `RMPR OWL ADD ON LIST`

| Property | Value |
|----------|-------|
| Tag | `EN` |
| Routine | `RMPR29W2` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** GUI Order controll processing.  Returns Add On's from material multiple  of 664.2. .

**API Endpoint:** `POST /vista/rmpr/rpc/rmpr-owl-add-on-list`

---

### `RMPR OWL ENTER/EDIT ADD ON`

| Property | Value |
|----------|-------|
| Tag | `EN` |
| Routine | `RMPR29MG` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** GUI Order controll processing.  ENTER/EDIT Add On's from material multiple of 664.2. .

**API Endpoint:** `POST /vista/rmpr/rpc/rmpr-owl-enter/edit-add-on`

---

### `RMPR OWL ENTER/EDIT HCPCS CODE`

| Property | Value |
|----------|-------|
| Tag | `EN` |
| Routine | `RMPR29BG` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** GUI Order controll processing.  ENTER/EDIT Primary Items Base Codes multiple of 664.1. .

**API Endpoint:** `GET /vista/rmpr/rpc/rmpr-owl-enter/edit-hcpcs-code`

---

### `RMPR OWL ENTER/EDIT HRS/RATE`

| Property | Value |
|----------|-------|
| Tag | `EN2` |
| Routine | `RMPR29MG` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** GUI Order controll processing.  ENTER/EDIT Technisions, Rate of Labor and Hours to 664.3 for the associated work  order. .

**API Endpoint:** `GET /vista/rmpr/rpc/rmpr-owl-enter/edit-hrs/rate`

---

### `RMPR OWL TECH/HOUR/RATE LIST`

| Property | Value |
|----------|-------|
| Tag | `EN` |
| Routine | `RMPR29L2` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** GUI Order controll processing.  Returns Technision, Hours, Rate,664.2  IEN,DUZ from file# 664.3. .

**API Endpoint:** `GET /vista/rmpr/rpc/rmpr-owl-tech/hour/rate-list`

---

### `RMPR OWL VISTA PRINT`

| Property | Value |
|----------|-------|
| Tag | `PRT` |
| Routine | `RMPR29RG` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** Purchase Order Information to be printed from a PC Device Fax/Printer

**API Endpoint:** `GET /vista/rmpr/rpc/rmpr-owl-vista-print`

---

### `RMPR OWL LOCK FILE`

| Property | Value |
|----------|-------|
| Tag | `OWLL` |
| Routine | `RMPRGULK` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** 

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | IEN | LITERAL | No |

**API Endpoint:** `POST /vista/rmpr/rpc/rmpr-owl-lock-file`

---

### `RMPR SUSPENSE LOCK`

| Property | Value |
|----------|-------|
| Tag | `SUSL` |
| Routine | `RMPRGULK` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | IEN | LITERAL | No |

**API Endpoint:** `POST /vista/rmpr/rpc/rmpr-suspense-lock`

---

### `RMPR SUSPENSE UNLOCK`

| Property | Value |
|----------|-------|
| Tag | `SUSU` |
| Routine | `RMPRGULK` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | IEN | LITERAL | No |

**API Endpoint:** `POST /vista/rmpr/rpc/rmpr-suspense-unlock`

---


## Menu Options

### Action

| Name | Security Key |
|------|-------------|
| RMPR GECS BATCH | — |
| RMPR GECS BATCH EDIT | — |
| RMPR GECS BATCHES STATUS | — |
| RMPR GECS BATCHES WAITING TRAN | — |
| RMPR GECS CODE EDIT | — |
| RMPR GECS CREATE | — |
| RMPR GECS DELETE | — |
| RMPR GECS KEYPUNCH | — |
| RMPR GECS PURGE | — |
| RMPR GECS READY FOR BATCHING L | — |
| RMPR GECS REBATCH | — |
| RMPR GECS RETRANSMIT | — |
| RMPR GECS REVIEW CODE SHEET | — |
| RMPR GECS TRANSMIT | — |
| RMPR CLOTHING | — |
| RMPR 2319 EDT | — |
| RMPR AUTO ADD | — |
| RMPR AUTO NEW | — |
| RMPR AUTO REP | — |
| RMPR VAN MOD | — |
| RMPR AUTO EDIT | — |
| RMPR AUTO INQ | — |
| RMPR EDIT 2319 | — |
| RMPR AUTO RECALL | — |
| RMPR DEL CODE | — |
| RMPR ED/DEL VOR | — |
| RMPR H/L OPEN | — |
| RMPR H/L CLOSE | — |
| RMPR H/L EDIT | — |
| RMPR H/L PRINT CLOSED | — |
| RMPR H/L PRINT OPEN | — |
| RMPR RETURN EDIT | — |
| RMPR PRINT 2529-3 | — |
| RMPR CREATE 2529-3 | — |
| RMPR EDIT/DELETE 2529-3 | — |
| RMPR 2529-3 ASSIGN | RMPR LAB SUPERVISOR |
| RMPR PROCESS 2529-3 JOB | — |
| RMPR COMPLETE 2529-3 | RMPR LAB SUPERVISOR |
| RMPR CLOSE 2529-3 | — |
| RMPR 2529-3 STATUS | — |
| RMPR 2529-3 PENDING | — |
| RMPR 2529-3 ASSIGNED | — |
| RMPR 2529-3 CLOSED | — |
| RMPR 10-2937a | RMPR LAB SUPERVISOR |
| RMPR REMOTE 2529-3 OPEN | — |
| RMPR REMOTE 2529-3 CLOSED | — |
| RMPR SUSP MENU | — |
| RMPR EDIT 2319 VENDOR/QTY/COST | RMPRSUPERVISOR |

### Menu

| Name | Security Key |
|------|-------------|
| RMPR GECS MAINTENANCE USER MEN | — |
| RMPR GECS REPORTS MENU | — |
| RMPR GECS USER MENU | — |
| RMPR GECS TRANSMIT USER | — |
| RMPR GECS MAIN MENU | — |
| RMPR PURCHASING MENU | — |
| RMPR UTILITIES | — |
| RMPR OFFICIAL | — |
| RMPR CLERK | — |
| RMPR DISPLAY/PRINT | — |
| RMPR ENT REQUESTS | — |
| RMPR STOCK ISS | — |
| RMPR REPRINTS | — |
| RMPR SUSPENSE MENU | — |
| RMPR AUTO | — |
| RMPR ENTITLEMENT/PSC | — |
| RMPR VEN/ITEM | RMPRSUPERVISOR |
| RMPR PURGE MENU | RMPRMANAGER |
| RMPR SITE MENU | RMPRMANAGER |
| RMPR CORR MAIN | — |
| RMPR SCHED-H/L VISITS | — |
| RMPR LAB MENU | RMPR LAB MENU |
| RMPR 2529-3 REQUEST MENU | — |
| RMPR 2529-3 MAIN | — |
| RMPR 2529-3 REPORTS | — |
| RMPR NPPD TOOLS | — |
| RMPR INV MAIN | — |
| RMPR INV REPORTS | — |

### Run routine

| Name | Security Key |
|------|-------------|
| RMPR ADD PATIENT | — |
| RMPR PRINT 2319 | — |
| RMPR ADD PSC | — |
| RMPR 2421 | — |
| RMPR 10-55 | — |
| RMPR ADD OTHER DAILY REC | — |
| RMPR 2914 - EYEGLASS | — |
| RMPR REPRINT 10-55 PSC | — |
| RMPR REPRINT 2421 | — |
| RMPR EDT 2319 | — |
| RMPR CANCEL | — |
| RMPR 2520 | — |
| RMPR ADD 2319 | — |
| RMPR CLOSE-OUT | RMPRSUPERVISOR |
| RMPR DIS ENTRY | — |
| RMPR SITE PARA | RMPRMANAGER |
| RMPR INQ SUSPENSE | — |
| RMPR SUSPENSE PRINT | — |
| RMPR PRINT OPEN STK ISS | — |
| RMPR DELIVERY | — |
| RMPR RETURN | — |
| RMPR PURGE CLOSED | — |
| RMPR PURGE CANCELLED | — |
| RMPR PURGE SUS | — |
| RMPR HIS DATA | — |
| RMPR PRINT RECALL | — |
| RMPR PRINT OPEN TRANS | — |
| RMPR PRINT BILL | — |
| RMPR HIS DEL | — |
| RMPR ELG INQ | — |
| RMPR AUTO ITM | — |
| RMPR AUTO MAN | — |
| RMPR CORR CREATE | — |
| RMPR CORR VIEW | — |
| RMPR CORR PRINT | — |
| RMPR CORR EDIT | RMPRMANAGER |
| RMPR CORR DELETE | — |
| RMPR ITEM HISTORY | — |
| RMPR SUSPENSE PRINT 5 DAY OLD | — |
| RMPR SUSPENSE STAT | — |
| RMPR PRINT OPEN TRANS INIT | — |
| RMPR HCPCS HISTORY | — |
| RMPR NPPD PRT | — |
| RMPR NPPD PRL L | — |
| RMPR INV ORDER | — |
| RMPR INV RECEIVE | — |
| RMPR INV STOCK BY LOCATION | — |
| RMPR INV PRINT/CHECK BAL | — |
| RMPR INV TRAN | — |
| RMPR INV RECONCILE | RMPRMANAGER |
| RMPR INV PRINT LAB ITEM | RMPRSUPERVISOR |
| RMPR INV STOCK BY HCPCS | — |
| RMPR LAB STOCK ISSUE | — |
| RMPR INV TASK BALANCE | — |
| RMPR EDT/COMP ISSUE | — |
| RMPR EDIT LAB STOCK ISSUE | — |
| RMPR ENTER LAB ISSUE | — |
| RMPR INV EDIT | — |
| RMPR INV ADD | — |
| RMPR LAB STOCK PENDING | — |
| RMPR CANCEL COMP LAB ISSUE | — |
| RMPR PSAS HCPCS HISTORY | — |
| RMPR NPPD QUICK EDIT | — |
| RMPR PENDING SUSPENSE | — |
| RMPR INV ON HND SUM | — |
| RMPR INV ON HND GROUP/LINE | — |
| RMPR INV ON HND HCPCS | — |
| RMPR INV ON HND ITEM | — |
| RMPR NPPDL PRL L | — |
| RMPR NPPDL PRT | — |
| RMPR VERIFY/REPAIR PC NUMBER | — |
| RMPR PCE BACKGROUND TASK | — |
| RMPR RECORDS WITH SUSPENSE | — |
| RMPR RECORDS WITHOUT SUSPENSE | — |
| RMPR PRINT PCE DATA | — |
| RMPR LINK 2319 TO SUSPENSE | — |
| RMPR VIEW 2319 READ ONLY | — |
| RMPR AUTO FIX | — |
| RMPR INV PRINT ORDER/RECEIVE | — |
| RMPR INV PRINT ITEM USAGE | — |
| RMPR INV EDIT LOCATION | — |
| RMPR INV PRINT WORK SHEET | — |
| RMPR INV REPRINT BARCODE | — |
| RMPR INV PRINT 30-DAY | — |
| RMPR INV PRINT OVER DATE | — |
| RMPR INV DEACTIVATE | — |
| RMPR INV PRINT ALL BARCODE | RMPRMANAGER |
| RMPR INV PIP/IFCAP ITEM REPORT | — |
| RMPR INV REMOVE HCPCS/ITEM | RMPRMANAGER |
| RMPR PFSS BACKGROUND | — |
| RMPR FILE CLEANSING | — |
| RMPR PURGE AGED | RMPRMANAGER |
| RMPR GIP STOCK | — |
| RMPR ECMS 2237 | — |

### Edit

| Name | Security Key |
|------|-------------|
| RMPR ADD ITEM MASTER | RMPRSUPERVISOR |
| RMPR ADD OD | — |
| RMPR ADD/EDIT HCPCS SYNONYM | RMPRSUPERVISOR |
| RMPR SET RENTAL FLAG | RMPRMANAGER |
| RMPR EDIT STATION | — |
| RMPR ENTER RECALL DATA | — |
| RMPR ENTER WAVIER | — |
| RMPR ENTER CONTRACT | — |

### Inquire

| Name | Security Key |
|------|-------------|
| RMPR 1358 INQ | — |
| RMPR SITE INQ | — |
| RMPR INQ VEN | — |
| RMPR 2529-3 INQ | — |
| RMPR NPPD INQ | — |
| RMPR WH DISPLAY | — |

### Print

| Name | Security Key |
|------|-------------|
| RMPR PRINT ALL ITEMS | RMPRSUPERVISOR |
| RMPR SUSPENSE PRINT CLOSED | — |
| RMPR NPPD LIST | — |
| RMPR PRINT OIF/OEF SUSPENSE | — |
| RMPR PRINT OIF/OEF ITEMS | — |

### Server

| Name | Security Key |
|------|-------------|
| RMPR AMIS SERVER | — |
| RMPR DALC | — |

### Broker

| Name | Security Key |
|------|-------------|
| RMPR NPPD GUI | — |
| RMPR GUI DOR | — |
| RMPR PFFS GUI | — |
| RMPR PURCHASE ORDER GUI | — |

## Security Keys

These VistA security keys control access to specific functions within this module:

- `RMPRSUPERVISOR`
- `RMPRMANAGER`
- `RMPR LAB SUPERVISOR`
- `RMPR LAB MENU`

## API Route Summary

All routes are prefixed with `/vista/rmpr/`.

| Method | Endpoint | RPC | Return Type |
|--------|----------|-----|-------------|
| GET | `/vista/rmpr/rpc/rmpr-nppd-list` | RMPR NPPD LIST | GLOBAL ARRAY |
| GET | `/vista/rmpr/rpc/rmpr-trans-list` | RMPR TRANS LIST | ARRAY |
| GET | `/vista/rmpr/rpc/rmpr-pt-dem` | RMPR PT DEM | ARRAY |
| POST | `/vista/rmpr/rpc/rmpr-pt-add` | RMPR PT ADD | ARRAY |
| GET | `/vista/rmpr/rpc/rmpr-trans-hisa` | RMPR TRANS HISA | ARRAY |
| GET | `/vista/rmpr/rpc/rmpr-trans-home-o2` | RMPR TRANS HOME O2 | ARRAY |
| GET | `/vista/rmpr/rpc/rmpr-critical-com` | RMPR CRITICAL COM | ARRAY |
| GET | `/vista/rmpr/rpc/rmpr-dis-list` | RMPR DIS LIST | ARRAY |
| POST | `/vista/rmpr/rpc/rmpr-add-item` | RMPR ADD ITEM | ARRAY |
| GET | `/vista/rmpr/rpc/rmpr-last-pt-movements` | RMPR LAST PT MOVEMENTS | ARRAY |
| GET | `/vista/rmpr/rpc/rmpr-ven-address` | RMPR VEN ADDRESS | ARRAY |
| GET | `/vista/rmpr/rpc/rmpr-clinic-enrollment` | RMPR CLINIC ENROLLMENT | ARRAY |
| GET | `/vista/rmpr/rpc/rmpr-cprs-display` | RMPR CPRS DISPLAY | ARRAY |
| GET | `/vista/rmpr/rpc/rmpr-clinic-letter-list` | RMPR CLINIC LETTER LIST | ARRAY |
| GET | `/vista/rmpr/rpc/rmpr-pending-appointments` | RMPR PENDING APPOINTMENTS | ARRAY |
| GET | `/vista/rmpr/rpc/rmpr-ifcap-check-auth` | RMPR IFCAP CHECK AUTH | ARRAY |
| GET | `/vista/rmpr/rpc/rmpr-clinic-letter-display` | RMPR CLINIC LETTER DISPLAY | ARRAY |
| GET | `/vista/rmpr/rpc/rmpr-trans-list-expanded` | RMPR TRANS LIST EXPANDED | ARRAY |
| GET | `/vista/rmpr/rpc/rmpr-trans-home-o2-rx` | RMPR TRANS HOME O2 RX | ARRAY |
| GET | `/vista/rmpr/rpc/rmpr-view-req` | RMPR VIEW REQ | ARRAY |
| GET | `/vista/rmpr/rpc/rmpr-view-req-desc` | RMPR VIEW REQ DESC | ARRAY |
| GET | `/vista/rmpr/rpc/rmpr-view-req-ia-note` | RMPR VIEW REQ IA NOTE | ARRAY |
| GET | `/vista/rmpr/rpc/rmpr-view-req-comp-note` | RMPR VIEW REQ COMP NOTE | ARRAY |
| GET | `/vista/rmpr/rpc/rmpr-dor` | RMPR DOR | GLOBAL ARRAY |
| GET | `/vista/rmpr/rpc/rmpr-pffs-list` | RMPR PFFS LIST | GLOBAL ARRAY |
| GET | `/vista/rmpr/rpc/rmpr-dis-list-660` | RMPR DIS LIST 660 | ARRAY |
| GET | `/vista/rmpr/rpc/rmpr-pffs-ins` | RMPR PFFS INS | ARRAY |
| GET | `/vista/rmpr/rpc/rmpr-open-pen-list` | RMPR OPEN PEN LIST | GLOBAL ARRAY |
| GET | `/vista/rmpr/rpc/rmpr-list-pcard` | RMPR LIST PCARD | ARRAY |
| POST | `/vista/rmpr/rpc/rmpr-create-po` | RMPR CREATE PO | ARRAY |
| GET | `/vista/rmpr/rpc/rmpr-list-cost-center` | RMPR LIST COST CENTER | ARRAY |
| GET | `/vista/rmpr/rpc/rmpr-list-boc` | RMPR LIST BOC | ARRAY |
| GET | `/vista/rmpr/rpc/rmpr-check-pa-authorization` | RMPR CHECK PA AUTHORIZATION | ARRAY |
| GET | `/vista/rmpr/rpc/rmpr-suspense-actions` | RMPR SUSPENSE ACTIONS | ARRAY |
| GET | `/vista/rmpr/rpc/rmpr-send-purchase-order` | RMPR SEND PURCHASE ORDER | SINGLE VALUE |
| POST | `/vista/rmpr/rpc/rmpr-po-create-vista-ien` | RMPR PO CREATE VISTA IEN | ARRAY |
| GET | `/vista/rmpr/rpc/rmpr-encrypt-pcard` | RMPR ENCRYPT PCARD | ARRAY |
| GET | `/vista/rmpr/rpc/rmpr-manager-comment` | RMPR MANAGER COMMENT | ARRAY |
| POST | `/vista/rmpr/rpc/rmpr-delete-po` | RMPR DELETE PO | ARRAY |
| GET | `/vista/rmpr/rpc/rmpr-nppd-list-x` | RMPR NPPD LIST X | GLOBAL ARRAY |
| GET | `/vista/rmpr/rpc/rmpr-check-fund-control-point` | RMPR CHECK FUND CONTROL POINT | ARRAY |
| GET | `/vista/rmpr/rpc/rmpr-pc-po-print` | RMPR PC PO PRINT | ARRAY |
| GET | `/vista/rmpr/rpc/rmpr-check-pros-patient` | RMPR CHECK PROS PATIENT | ARRAY |
| POST | `/vista/rmpr/rpc/rmpr-create-work-order` | RMPR CREATE WORK ORDER | ARRAY |
| GET | `/vista/rmpr/rpc/rmpr-owl-suspense-actions` | RMPR OWL SUSPENSE ACTIONS | ARRAY |
| GET | `/vista/rmpr/rpc/rmpr-owl-work-order-list` | RMPR OWL WORK ORDER LIST | GLOBAL ARRAY |
| GET | `/vista/rmpr/rpc/rmpr-owl-pc-print` | RMPR OWL PC PRINT | ARRAY |
| GET | `/vista/rmpr/rpc/rmpr-owl-item-list` | RMPR OWL ITEM LIST | GLOBAL ARRAY |
| GET | `/vista/rmpr/rpc/rmpr-purchase-order-control` | RMPR PURCHASE ORDER CONTROL | GLOBAL ARRAY |
| POST | `/vista/rmpr/rpc/rmpr-owl-add-on-list` | RMPR OWL ADD ON LIST | GLOBAL ARRAY |
| POST | `/vista/rmpr/rpc/rmpr-owl-enter/edit-add-on` | RMPR OWL ENTER/EDIT ADD ON | ARRAY |
| GET | `/vista/rmpr/rpc/rmpr-owl-enter/edit-hcpcs-code` | RMPR OWL ENTER/EDIT HCPCS CODE | ARRAY |
| GET | `/vista/rmpr/rpc/rmpr-owl-enter/edit-hrs/rate` | RMPR OWL ENTER/EDIT HRS/RATE | ARRAY |
| GET | `/vista/rmpr/rpc/rmpr-owl-tech/hour/rate-list` | RMPR OWL TECH/HOUR/RATE LIST | GLOBAL ARRAY |
| GET | `/vista/rmpr/rpc/rmpr-owl-vista-print` | RMPR OWL VISTA PRINT | ARRAY |
| POST | `/vista/rmpr/rpc/rmpr-owl-lock-file` | RMPR OWL LOCK FILE | ARRAY |
| POST | `/vista/rmpr/rpc/rmpr-suspense-lock` | RMPR SUSPENSE LOCK | ARRAY |
| POST | `/vista/rmpr/rpc/rmpr-suspense-unlock` | RMPR SUSPENSE UNLOCK | ARRAY |
