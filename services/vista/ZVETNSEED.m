ZVETNSEED ;VE/KM - Tenant Config Seeder for Provisioned VistA Instances ;2026-03-09
 ;;1.0;VistA-Evolved Tenant Seed;;
 ;
 ; Purpose: Seeds a fresh VistA instance with tenant-specific configuration.
 ; Called by the provisioning orchestrator after routine installation.
 ;
 ; Entry points:
 ;   SEED^ZVETNSEED(FACNAME,STATION,DIVNAME) — Full seed pipeline
 ;   SETFAC^ZVETNSEED(FACNAME,STATION)       — Update facility identity (File #4)
 ;   SETDIV^ZVETNSEED(DIVNAME,STATION)       — Create/update division (File #40.8)
 ;   DEFCLIN^ZVETNSEED(CLINNAME)             — Create default clinic (File #44)
 ;   VERIFY^ZVETNSEED                         — Verify seed results
 ;
 Q
 ;
SEED(FACNAME,STATION,DIVNAME) ; Full tenant seed pipeline
 N RESULT
 S RESULT=""
 ;
 ; Default values
 I $G(FACNAME)="" S FACNAME="NEW FACILITY"
 I $G(STATION)="" S STATION="500"
 I $G(DIVNAME)="" S DIVNAME=FACNAME
 ;
 W !,"=== VistA-Evolved Tenant Seed ==="
 W !,"Facility: "_FACNAME
 W !,"Station:  "_STATION
 W !,"Division: "_DIVNAME,!
 ;
 D SETFAC(FACNAME,STATION)
 D SETDIV(DIVNAME,STATION)
 D DEFCLIN("PRIMARY CARE")
 D DEFCLIN("URGENT CARE")
 ;
 W !,"=== Seed Complete ==="
 D VERIFY
 Q
 ;
SETFAC(FACNAME,STATION) ; Update facility identity in File #4 (Institution)
 ; Find the institution linked to station number
 N IEN,FDA,IENS,ERR
 ;
 ; Look for existing institution by station number
 S IEN=""
 S IEN=$O(^DIC(4,"D",STATION,""))
 I IEN'>0 D
 . ; Try B index with default name
 . S IEN=$O(^DIC(4,"B","VEHU MEDICAL CENTER",""))
 . I IEN'>0 S IEN=$O(^DIC(4,"B",""))
 ;
 I IEN'>0 D  Q
 . W !,"SETFAC: No institution found - cannot update"
 ;
 W !,"SETFAC: Updating institution IEN "_IEN
 ;
 ; Use FileMan to update the name
 S IENS=IEN_","
 S FDA(4,IENS,.01)=FACNAME
 I $G(STATION)'="" S FDA(4,IENS,99)=STATION
 D FILE^DIE("","FDA","ERR")
 I $D(ERR) D  Q
 . W !,"SETFAC ERROR: "
 . N E S E="" F  S E=$O(ERR("DIERR",1,"TEXT",E)) Q:E=""  W !,ERR("DIERR",1,"TEXT",E)
 ;
 W !,"SETFAC: Updated institution "_IEN_" to "_FACNAME_" (station "_STATION_")"
 Q
 ;
SETDIV(DIVNAME,STATION) ; Create or update division in File #40.8
 N IEN,FDA,IENS,ERR,INSTIEN
 ;
 ; Find the institution IEN first
 S INSTIEN=$O(^DIC(4,"D",STATION,""))
 I INSTIEN'>0 S INSTIEN=$O(^DIC(4,"B",DIVNAME,""))
 ;
 ; Check if division already exists for this institution
 S IEN=""
 I INSTIEN>0 D
 . S IEN=$O(^DG(40.8,"B",DIVNAME,""))
 . I IEN'>0 D
 . . ; Check if any division points to this institution
 . . N D1 S D1=0
 . . F  S D1=$O(^DG(40.8,D1)) Q:D1'>0  D
 . . . N INST S INST=$$GET1^DIQ(40.8,D1,1,"I")
 . . . I INST=INSTIEN S IEN=D1
 ;
 I IEN>0 D  Q
 . W !,"SETDIV: Division already exists (IEN "_IEN_")"
 ;
 ; Create new division via FileMan
 I INSTIEN'>0 D  Q
 . W !,"SETDIV: Cannot create division - no institution found for station "_STATION
 ;
 S FDA(40.8,"+1,",.01)=DIVNAME
 S FDA(40.8,"+1,",1)=INSTIEN
 D UPDATE^DIE("","FDA","","ERR")
 I $D(ERR) D  Q
 . W !,"SETDIV ERROR: "
 . N E S E="" F  S E=$O(ERR("DIERR",1,"TEXT",E)) Q:E=""  W !,ERR("DIERR",1,"TEXT",E)
 ;
 W !,"SETDIV: Created division "_DIVNAME
 Q
 ;
DEFCLIN(CLINNAME) ; Create a default clinic in File #44 (Hospital Location)
 N IEN,FDA,IENS,ERR
 ;
 ; Check if clinic already exists
 S IEN=$O(^SC("B",CLINNAME,""))
 I IEN>0 D  Q
 . W !,"DEFCLIN: Clinic '"_CLINNAME_"' already exists (IEN "_IEN_")"
 ;
 ; Create via FileMan
 ; Type = C (Clinic), field 2 = "C"
 S FDA(44,"+1,",.01)=CLINNAME
 S FDA(44,"+1,",2)="C"
 S FDA(44,"+1,",2.1)=1  ; Appointment length (minutes) - default 30 changed to 1 for basic
 S FDA(44,"+1,",1912)=30  ; Default appt length
 D UPDATE^DIE("","FDA","","ERR")
 I $D(ERR) D  Q
 . W !,"DEFCLIN ERROR creating '"_CLINNAME_"': "
 . N E S E="" F  S E=$O(ERR("DIERR",1,"TEXT",E)) Q:E=""  W !,ERR("DIERR",1,"TEXT",E)
 ;
 ; Verify it was created
 S IEN=$O(^SC("B",CLINNAME,""))
 I IEN>0 W !,"DEFCLIN: Created clinic '"_CLINNAME_"' (IEN "_IEN_")"
 E  W !,"DEFCLIN: Clinic creation did not produce an IEN"
 Q
 ;
VERIFY ; Verify seed results
 W !,!,"=== Tenant Seed Verification ==="
 ;
 ; Check institutions
 N CNT S CNT=0
 N IEN S IEN=0 F  S IEN=$O(^DIC(4,IEN)) Q:IEN'>0  S CNT=CNT+1
 W !,"Institutions (File #4): "_CNT
 ;
 ; Show first few
 S IEN=0 N I S I=0
 F  S IEN=$O(^DIC(4,IEN)) Q:IEN'>0  Q:I>4  D
 . S I=I+1
 . W !,"  IEN "_IEN_": "_$$GET1^DIQ(4,IEN,.01)_" (Station: "_$$GET1^DIQ(4,IEN,99)_")"
 ;
 ; Check divisions
 S CNT=0,IEN=0 F  S IEN=$O(^DG(40.8,IEN)) Q:IEN'>0  S CNT=CNT+1
 W !,"Divisions (File #40.8): "_CNT
 ;
 ; Check clinics
 S CNT=0,IEN=0 F  S IEN=$O(^SC(IEN)) Q:IEN'>0  D
 . N TYP S TYP=$$GET1^DIQ(44,IEN,2,"I")
 . I TYP="C" S CNT=CNT+1
 W !,"Clinics (File #44, type C): "_CNT
 ;
 W !,"=== Verification Complete ==="
 Q
