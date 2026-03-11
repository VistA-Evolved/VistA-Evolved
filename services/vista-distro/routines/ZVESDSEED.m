ZVESDSEED ;VistA-Evolved/SD Scheduling Sandbox Seeder - Phase 147
 ;;1.0;VistA-Evolved DEV ONLY;;Build 147
 ;
 ; *** DEV/DEMO ONLY -- NOT FOR PRODUCTION USE ***
 ;
 ; Purpose: Seed WorldVistA Docker sandbox with minimal scheduling data
 ;          so that SDES / SDOE / SD RPCs return non-empty results.
 ;
 ; What it seeds:
 ;   1. Hospital Location (File 44) - 3 clinics if not already present
 ;   2. Appointment availability patterns (File 44.005)
 ;   3. Patient appointments for DFN 3 (CARTER,DAVID) via ^SC entries
 ;
 ; Install:
 ;   docker cp services/vista/ZVESDSEED.m wv:/tmp/ZVESDSEED.m
 ;   docker exec -it wv su - wv -c "mumps -r ZVESDSEED"
 ;
 ; Verify:
 ;   After running, call SDES GET APPTS BY PATIENT DFN3 via RPC Broker
 ;   or check ^SC global directly.
 ;
 ; *** This routine is idempotent -- safe to run multiple times ***
 ;
EN ; Entry point
 W !,"=== VistA-Evolved Scheduling Sandbox Seeder (Phase 147) ==="
 W !,"*** DEV/DEMO ONLY -- NOT FOR PRODUCTION ***",!
 ;
 D CLINICS
 D APPTTYPES
 D APPTS
 ;
 W !,"=== Seeding complete ==="
 W !,"Run 'D VERIFY^ZVESDSEED' to check results.",!
 Q
 ;
CLINICS ; Ensure 3 clinics exist in File 44 (Hospital Location)
 ; WorldVistA typically has some clinics, we'll verify and add if missing.
 W !,"--- Checking Hospital Location (File 44) ---"
 N CT,IEN,NAME
 S CT=0
 S IEN="" F  S IEN=$O(^SC(IEN)) Q:IEN=""  D
 . S NAME=$P($G(^SC(IEN,0)),"^",1)
 . I NAME'="" S CT=CT+1
 W !,"  Existing clinics in ^SC: ",CT
 ;
 ; Only seed if fewer than 3 clinics exist
 I CT<3 D
 . W !,"  Seeding additional clinics..."
 . D ADDCLINIC("PRIMARY CARE CLINIC","PC",301,"M")
 . D ADDCLINIC("MENTAL HEALTH CLINIC","MH",502,"M")
 . D ADDCLINIC("CARDIOLOGY CLINIC","CARD",303,"M")
 E  D
 . W !,"  Sufficient clinics present -- skipping clinic seed."
 Q
 ;
ADDCLINIC(NAME,ABBR,STOP,TYPE) ; Add a clinic to File 44 if not exists
 N IEN,FOUND
 ; Check if clinic already exists by name
 S FOUND=0,IEN=""
 F  S IEN=$O(^SC(IEN)) Q:IEN=""  D  Q:FOUND
 . I $P($G(^SC(IEN,0)),"^",1)=NAME S FOUND=1
 I FOUND W !,"  Clinic '",NAME,"' already exists (IEN ",IEN,") -- skipping." Q
 ;
 ; Find next available IEN
 S IEN=$O(^SC(""),-1)+1
 I IEN<100 S IEN=100 ; Start seeded clinics at IEN 100+
 ;
 ; Set File 44 zero node: NAME^ABBR^TYPE^...
 ; Type: M=medicine, S=surgery, P=psychiatry
 S ^SC(IEN,0)=NAME_"^"_ABBR_"^"_TYPE_"^^^"_STOP
 ; Set stop code
 S ^SC(IEN,"I")=""
 ;
 W !,"  Added clinic '",NAME,"' as IEN ",IEN
 Q
 ;
APPTTYPES ; Ensure appointment types exist in SD APPOINTMENT TYPE file
 W !,"--- Checking SD Appointment Type ---"
 ; File 409.1 = SD APPOINTMENT TYPE
 N CT S CT=0
 S IEN="" F  S IEN=$O(^SD(409.1,IEN)) Q:IEN=""  S CT=CT+1
 W !,"  Existing appointment types: ",CT
 I CT>0 W !,"  Appointment types present -- skipping." Q
 ;
 W !,"  Seeding appointment types..."
 ; Minimal types: 1=Regular, 2=Walk-in, 3=Telephone
 S ^SD(409.1,1,0)="REGULAR^R"
 S ^SD(409.1,2,0)="WALK-IN^W"
 S ^SD(409.1,3,0)="TELEPHONE^T"
 S ^SD(409.1,0)="SD APPOINTMENT TYPE^409.1^3^3"
 W !,"  Added 3 appointment types."
 Q
 ;
APPTS ; Seed sample appointments for DFN 3 (CARTER,DAVID)
 W !,"--- Seeding sample appointments for DFN 3 ---"
 N DFN,CLINIEN,DTFM,DTNOW,DT7,DT14,DT30
 S DFN=3
 ;
 ; Verify patient exists
 I '$D(^DPT(DFN,0)) D  Q
 . W !,"  ERROR: Patient DFN 3 not found in ^DPT. Skipping appointment seed."
 ;
 ; Get current date in VistA format (YYYMMDD)
 S DTNOW=$$NOW^XLFDT
 ; Future dates: +7, +14, +30 days
 S DT7=$$FMADD^XLFDT(DTNOW,7)
 S DT14=$$FMADD^XLFDT(DTNOW,14)
 S DT30=$$FMADD^XLFDT(DTNOW,30)
 ;
 ; Find first clinic IEN
 S CLINIEN=""
 S CLINIEN=$O(^SC(""))
 I CLINIEN="" W !,"  No clinics found. Run CLINICS first." Q
 ;
 ; Check if appointments already exist for this patient
 N EXISTING S EXISTING=0
 I $D(^SC(CLINIEN,"S")) D
 . N DT S DT="" F  S DT=$O(^SC(CLINIEN,"S",DT)) Q:DT=""  D
 . . N SUB S SUB="" F  S SUB=$O(^SC(CLINIEN,"S",DT,1,SUB)) Q:SUB=""  D
 . . . I $P($G(^SC(CLINIEN,"S",DT,1,SUB,0)),"^",1)=DFN S EXISTING=EXISTING+1
 ;
 I EXISTING>0 D  Q
 . W !,"  Patient DFN ",DFN," already has ",EXISTING," appointment(s) -- skipping."
 ;
 W !,"  Clinic IEN: ",CLINIEN
 ;
 ; Create appointments in ^SC(clinic,"S",date,1,sub,0)
 ; Format: DFN^apptLength^...
 D ADDAPPT(CLINIEN,DT7_".09",DFN,30,"FOLLOW-UP VISIT")
 D ADDAPPT(CLINIEN,DT14_".1",DFN,20,"LAB REVIEW")
 D ADDAPPT(CLINIEN,DT30_".14",DFN,60,"ANNUAL PHYSICAL")
 ;
 ; Also create ^AUPNVSIT entries for SDOE to find
 D ADDVISIT(DFN,DT7_".09",CLINIEN,"FOLLOW-UP VISIT")
 D ADDVISIT(DFN,DT14_".1",CLINIEN,"LAB REVIEW")
 ;
 W !,"  Seeded 3 future appointments + 2 visit records."
 Q
 ;
ADDAPPT(CLINIEN,APPTDT,DFN,LEN,REASON) ; Add appointment to ^SC schedule
 ; ^SC(clinicIen,"S",date,1,subIen,0) = DFN^length^...
 N SUBIEN
 I '$D(^SC(CLINIEN,"S",APPTDT,1,0)) D
 . S ^SC(CLINIEN,"S",APPTDT,1,0)="^44.003PA^^"
 S SUBIEN=$O(^SC(CLINIEN,"S",APPTDT,1,""),-1)+1
 S ^SC(CLINIEN,"S",APPTDT,1,SUBIEN,0)=DFN_"^"_LEN_"^^^"_REASON
 W !,"    Appt: ",APPTDT," DFN=",DFN," len=",LEN,"min"
 Q
 ;
ADDVISIT(DFN,VISITDT,CLINIEN,REASON) ; Add visit to ^AUPNVSIT for SDOE
 ; ^AUPNVSIT(ien,0) = date^patient^...
 N IEN
 S IEN=$O(^AUPNVSIT(""),-1)+1
 I IEN<10000 S IEN=10000 ; Start seeded visits high to avoid collisions
 S ^AUPNVSIT(IEN,0)=VISITDT_"^"_DFN_"^"_CLINIEN_"^^^^^^^"_REASON
 S ^AUPNVSIT(IEN,12)=CLINIEN
 ; Cross-reference by patient
 S ^AUPNVSIT("B",VISITDT,IEN)=""
 S ^AUPNVSIT("C",DFN,IEN)=""
 W !,"    Visit IEN: ",IEN," date=",VISITDT
 Q
 ;
VERIFY ; Verify seeded data
 W !,"=== Verifying Scheduling Seed Data ===",!
 ;
 ; Check clinics
 N CT,IEN,NAME
 S CT=0,IEN=""
 F  S IEN=$O(^SC(IEN)) Q:IEN=""  D
 . S NAME=$P($G(^SC(IEN,0)),"^",1)
 . I NAME'="" S CT=CT+1 W !,"  Clinic: ",IEN," = ",NAME
 W !,"  Total clinics: ",CT,!
 ;
 ; Check appointments for DFN 3
 W !,"  Appointments for DFN 3:"
 N CLINIEN,DT,SUB,APPTCT
 S APPTCT=0,CLINIEN=""
 F  S CLINIEN=$O(^SC(CLINIEN)) Q:CLINIEN=""  D
 . I '$D(^SC(CLINIEN,"S")) Q
 . S DT="" F  S DT=$O(^SC(CLINIEN,"S",DT)) Q:DT=""  D
 . . S SUB="" F  S SUB=$O(^SC(CLINIEN,"S",DT,1,SUB)) Q:SUB=""  D
 . . . N D0 S D0=$G(^SC(CLINIEN,"S",DT,1,SUB,0))
 . . . I $P(D0,"^",1)=3 D
 . . . . S APPTCT=APPTCT+1
 . . . . W !,"    Clinic=",CLINIEN," Date=",DT," Len=",$P(D0,"^",2)
 W !,"  Total appointments for DFN 3: ",APPTCT,!
 ;
 ; Check AUPNVSIT visits
 W !,"  Visit records (^AUPNVSIT) for DFN 3:"
 N VIEN,VCT S VCT=0,VIEN=""
 I $D(^AUPNVSIT("C",3)) D
 . F  S VIEN=$O(^AUPNVSIT("C",3,VIEN)) Q:VIEN=""  D
 . . S VCT=VCT+1
 . . W !,"    Visit IEN=",VIEN," Date=",$P($G(^AUPNVSIT(VIEN,0)),"^",1)
 W !,"  Total visits for DFN 3: ",VCT,!
 ;
 ; Summary
 W !,"=== VERIFY SUMMARY ==="
 W !,"  Clinics: ",CT
 W !,"  DFN 3 appointments: ",APPTCT
 W !,"  DFN 3 visits: ",VCT
 I CT>0,APPTCT>0 D
 . W !,"  STATUS: PASS -- scheduling data present"
 E  D
 . W !,"  STATUS: INCOMPLETE -- run 'mumps -r ZVESDSEED' to seed"
 W !
 Q
