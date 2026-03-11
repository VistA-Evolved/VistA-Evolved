ZVEPATREG ;VE;Patient Registration RPCs;2026-03-10
 ;
 ; PURPOSE: Production RPCs for patient registration and demographics
 ; management. Creates new patients in VistA File #2 (PATIENT/^DPT)
 ; via FileMan API, and provides demographic update/query operations.
 ;
 ; VistA Patient Registration Architecture:
 ;   File 2    = PATIENT (^DPT) -- the master patient record
 ;   File 391.91 = PATIENT TYPE
 ;   File 8    = STATE
 ;   File 5    = MARITAL STATUS
 ;   File .02  = RACE
 ;   File .05  = ETHNICITY
 ;   File 4    = INSTITUTION
 ;
 ; Required fields for File 2 new entry:
 ;   .01  = NAME (LAST,FIRST format)
 ;   .03  = DATE OF BIRTH (FM date)
 ;   .02  = SEX (M or F)
 ;
 ; Additional recommended fields:
 ;   .09  = SSN (9 digits, no dashes)
 ;   .301 = SERVICE CONNECTED? (Y/N)
 ;   .1041= STREET ADDRESS
 ;   .114 = CITY
 ;   .115 = STATE (pointer to File 8)
 ;   .116 = ZIP CODE
 ;   .131 = PHONE (RESIDENCE)
 ;   391  = TYPE (pointer to File 391.91)
 ;
 ; Entry Points / RPCs:
 ;   REGISTER^ZVEPATREG -> VE PAT REGISTER   -- Create new patient
 ;   DEMOG^ZVEPATREG    -> VE PAT DEMOG      -- Get demographics
 ;   UPDATE^ZVEPATREG   -> VE PAT UPDATE      -- Update demographics
 ;   SEARCH^ZVEPATREG   -> VE PAT SEARCH      -- Search by name/SSN/DOB
 ;   MERGE^ZVEPATREG    -> VE PAT MERGE       -- Merge check (duplicate detection)
 ;
 Q
 ;
ERRTRAP ;
 S $ECODE=""
 S RESULT(0)="-1^ERROR^"_$$ERRMSG()
 Q
 ;
ERRMSG() ;
 N MSG S MSG=$ZERROR
 I MSG="" S MSG="Unknown M error"
 I $L(MSG)>200 S MSG=$E(MSG,1,200)
 Q MSG
 ;
REGISTER(RESULT,NAME,DOB,SEX,SSN,STREET,CITY,STATE,ZIP,PHONE,VETSTAT) ;
 ; Create new patient in File #2 (PATIENT).
 ;
 ; Parameters:
 ;   NAME    = "LAST,FIRST MI" (required, must contain comma)
 ;   DOB     = Date of birth FM format YYYMMDD (required)
 ;   SEX     = M or F (required)
 ;   SSN     = 9-digit SSN [optional but strongly recommended]
 ;   STREET  = Street address [optional]
 ;   CITY    = City [optional]
 ;   STATE   = State abbreviation or IEN [optional]
 ;   ZIP     = ZIP code [optional]
 ;   PHONE   = Phone number [optional]
 ;   VETSTAT = Veteran status Y/N [optional, default N]
 ;
 N U,FDA,IENS,ERR,NEWIEN,DUPCHK
 S U="^"
 N $ESTACK,$ETRAP S $ETRAP="D ERRTRAP^ZVEPATREG Q"
 ;
 ; Validate required fields
 S NAME=$G(NAME)
 I NAME="" S RESULT(0)="-1^Patient name required (LAST,FIRST format)" Q
 I NAME'["," S RESULT(0)="-1^Name must be in LAST,FIRST format" Q
 S DOB=$G(DOB)
 I DOB="" S RESULT(0)="-1^Date of birth required (FM date format)" Q
 I +DOB<2000101 S RESULT(0)="-1^DOB appears invalid (must be FM date, e.g., 3260115 for 2026-01-15)" Q
 S SEX=$G(SEX)
 I SEX="" S RESULT(0)="-1^Sex required (M or F)" Q
 I "MF"'[SEX S RESULT(0)="-1^Sex must be M or F" Q
 S SSN=$G(SSN)
 S STREET=$G(STREET)
 S CITY=$G(CITY)
 S STATE=$G(STATE)
 S ZIP=$G(ZIP)
 S PHONE=$G(PHONE)
 S VETSTAT=$G(VETSTAT) I VETSTAT="" S VETSTAT="N"
 ;
 ; Duplicate check: search for same name + DOB
 S DUPCHK=$$DUPCHECK(NAME,DOB,SSN)
 I DUPCHK>0 D
 . S RESULT(0)="-1^DUPLICATE_DETECTED"
 . S RESULT(1)="DFN^"_DUPCHK
 . S RESULT(2)="NAME^"_$P($G(^DPT(DUPCHK,0)),U,1)
 . S RESULT(3)="DOB^"_$P($G(^DPT(DUPCHK,0)),U,3)
 . S RESULT(4)="MSG^Patient with same name/DOB/SSN already exists"
 I DUPCHK>0 Q
 ;
 ; Create patient via FileMan UPDATE^DIE
 S IENS="+1,"
 S FDA(2,IENS,.01)=NAME
 S FDA(2,IENS,.02)=SEX
 S FDA(2,IENS,.03)=DOB
 I SSN'="" S FDA(2,IENS,.09)=SSN
 I STREET'="" S FDA(2,IENS,.1041)=STREET
 I CITY'="" S FDA(2,IENS,.114)=CITY
 I ZIP'="" S FDA(2,IENS,.116)=ZIP
 I PHONE'="" S FDA(2,IENS,.131)=PHONE
 ; Veteran status
 I VETSTAT="Y" S FDA(2,IENS,.301)="Y"
 ; Resolve state abbreviation to IEN if needed
 I STATE'="" D
 . N STIEN
 . I STATE?1N.N S FDA(2,IENS,.115)=+STATE Q
 . ; Look up by abbreviation in File 5
 . S STIEN=$O(^DIC(5,"C",STATE,""))
 . I STIEN>0 S FDA(2,IENS,.115)=STIEN
 ;
 D UPDATE^DIE("E","FDA","NEWIEN","ERR")
 I $D(ERR) D  Q
 . S RESULT(0)="-1^Registration failed: "_$G(ERR("DIERR",1,"TEXT",1))
 ;
 N DFN S DFN=$G(NEWIEN(1))
 I 'DFN S RESULT(0)="-1^UPDATE^DIE succeeded but returned no IEN" Q
 ;
 ; Set additional fields that may need direct sets
 ; Patient type: default to NSC VETERAN (usually IEN 2)
 I VETSTAT="Y" S $P(^DPT(DFN,"TYPE"),U,1)=2
 ;
 S RESULT(0)="1^OK"
 S RESULT(1)="DFN^"_DFN
 S RESULT(2)="NAME^"_NAME
 S RESULT(3)="DOB^"_DOB
 S RESULT(4)="SEX^"_SEX
 I SSN'="" S RESULT(5)="SSN^"_$E(SSN,$L(SSN)-3,$L(SSN))  ; Last 4 only
 S RESULT(6)="SOURCE^FILE_2_FILEMAN"
 Q
 ;
DEMOG(RESULT,DFN) ;Get patient demographics
 ; Returns comprehensive demographics from File #2
 ;
 N U,NODE,NAME,DOB,SEX,SSN,ADDR,CITY,STATE,ZIP,PHONE
 S U="^"
 N $ESTACK,$ETRAP S $ETRAP="D ERRTRAP^ZVEPATREG Q"
 S DFN=+$G(DFN)
 I 'DFN S RESULT(0)="-1^Patient DFN required" Q
 I '$D(^DPT(DFN,0)) S RESULT(0)="-1^Patient not found (DFN="_DFN_")" Q
 ;
 S NODE=$G(^DPT(DFN,0))
 S NAME=$P(NODE,U,1)
 S DOB=$P(NODE,U,3)
 S SEX=$P(NODE,U,2)
 S SSN=$P(NODE,U,9)
 ;
 ; Address from .11 node
 N ADDRNODE S ADDRNODE=$G(^DPT(DFN,.11))
 S ADDR=$P(ADDRNODE,U,1)
 S CITY=$P(ADDRNODE,U,4)
 N STIEN S STIEN=$P(ADDRNODE,U,5)
 S STATE=""
 I STIEN>0 S STATE=$P($G(^DIC(5,STIEN,0)),U,1)
 S ZIP=$P(ADDRNODE,U,6)
 S PHONE=$P($G(^DPT(DFN,.13)),U,1)
 ;
 ; Service connected status
 N SC S SC=$P($G(^DPT(DFN,.3)),U,1)
 ;
 ; Means test
 N MT S MT=$P($G(^DPT(DFN,.38)),U,1)
 ;
 ; Emergency contact
 N EMERG S EMERG=$G(^DPT(DFN,.33))
 ;
 S RESULT(0)="1^OK"
 S RESULT(1)="DFN^"_DFN
 S RESULT(2)="NAME^"_NAME
 S RESULT(3)="DOB^"_DOB
 S RESULT(4)="SEX^"_SEX
 S RESULT(5)="SSN_LAST4^"_$E(SSN,$L(SSN)-3,$L(SSN))
 S RESULT(6)="ADDRESS^"_ADDR
 S RESULT(7)="CITY^"_CITY
 S RESULT(8)="STATE^"_STATE
 S RESULT(9)="ZIP^"_ZIP
 S RESULT(10)="PHONE^"_PHONE
 S RESULT(11)="SERVICE_CONNECTED^"_SC
 S RESULT(12)="MEANS_TEST^"_MT
 S RESULT(13)="EMERGENCY_CONTACT^"_$P(EMERG,U,1)
 S RESULT(14)="SOURCE^FILE_2"
 Q
 ;
UPDATE(RESULT,DFN,FIELD,VALUE) ;Update patient demographics
 ; FIELD = one of: PHONE, ADDRESS, CITY, STATE, ZIP, STREET
 ;
 N U,FDA,IENS,ERR
 S U="^"
 N $ESTACK,$ETRAP S $ETRAP="D ERRTRAP^ZVEPATREG Q"
 S DFN=+$G(DFN)
 I 'DFN S RESULT(0)="-1^Patient DFN required" Q
 I '$D(^DPT(DFN,0)) S RESULT(0)="-1^Patient not found" Q
 S FIELD=$G(FIELD)
 I FIELD="" S RESULT(0)="-1^Field name required" Q
 S VALUE=$G(VALUE)
 ;
 S IENS=DFN_","
 I FIELD="PHONE" S FDA(2,IENS,.131)=VALUE
 I FIELD="STREET"!(FIELD="ADDRESS") S FDA(2,IENS,.1041)=VALUE
 I FIELD="CITY" S FDA(2,IENS,.114)=VALUE
 I FIELD="STATE" D
 . I VALUE?1N.N S FDA(2,IENS,.115)=+VALUE Q
 . N STIEN S STIEN=$O(^DIC(5,"C",VALUE,""))
 . I STIEN>0 S FDA(2,IENS,.115)=STIEN
 I FIELD="ZIP" S FDA(2,IENS,.116)=VALUE
 ;
 I '$D(FDA) S RESULT(0)="-1^Unrecognized field: "_FIELD Q
 ;
 D FILE^DIE("E","FDA","ERR")
 I $D(ERR) S RESULT(0)="-1^Update failed: "_$G(ERR("DIERR",1,"TEXT",1)) Q
 ;
 S RESULT(0)="1^OK"
 S RESULT(1)="DFN^"_DFN
 S RESULT(2)="FIELD^"_FIELD
 S RESULT(3)="VALUE^"_VALUE
 S RESULT(4)="SOURCE^FILE_2"
 Q
 ;
SEARCH(RESULT,QUERY,TYPE) ;Search patients by name, SSN, or DOB
 ; TYPE = "NAME" (default), "SSN", "DOB", "LAST4"
 ;
 N U,I,IEN,NODE,SRCHVAL
 S U="^"
 N $ESTACK,$ETRAP S $ETRAP="D ERRTRAP^ZVEPATREG Q"
 S QUERY=$G(QUERY)
 I QUERY="" S RESULT(0)="-1^Search query required" Q
 S TYPE=$G(TYPE) I TYPE="" S TYPE="NAME"
 ;
 S I=0
 I TYPE="NAME" D
 . ; Use "B" cross-reference on File 2
 . S SRCHVAL=$$UP^XLFSTR(QUERY)
 . N NM S NM=$O(^DPT("B",SRCHVAL),-1)
 . F  S NM=$O(^DPT("B",NM)) Q:NM=""  Q:NM'[SRCHVAL  Q:I>100  D
 . . S IEN=0
 . . F  S IEN=$O(^DPT("B",NM,IEN)) Q:'IEN  D
 . . . S NODE=$G(^DPT(IEN,0))
 . . . S I=I+1
 . . . S RESULT(I)=IEN_U_$P(NODE,U,1)_U_$P(NODE,U,3)_U_$P(NODE,U,2)_U_$E($P(NODE,U,9),$L($P(NODE,U,9))-3,$L($P(NODE,U,9)))
 ;
 I TYPE="SSN" D
 . ; Use "SSN" cross-reference
 . I $D(^DPT("SSN",QUERY)) D
 . . S IEN=0
 . . F  S IEN=$O(^DPT("SSN",QUERY,IEN)) Q:'IEN  D
 . . . S NODE=$G(^DPT(IEN,0))
 . . . S I=I+1
 . . . S RESULT(I)=IEN_U_$P(NODE,U,1)_U_$P(NODE,U,3)_U_$P(NODE,U,2)_U_$E(QUERY,$L(QUERY)-3,$L(QUERY))
 ;
 I TYPE="LAST4" D
 . ; Search SSN ending with these 4 digits
 . N SSN S SSN=""
 . F  S SSN=$O(^DPT("SSN",SSN)) Q:SSN=""  Q:I>100  D
 . . I $E(SSN,$L(SSN)-3,$L(SSN))=QUERY D
 . . . S IEN=0
 . . . F  S IEN=$O(^DPT("SSN",SSN,IEN)) Q:'IEN  D
 . . . . S NODE=$G(^DPT(IEN,0))
 . . . . S I=I+1
 . . . . S RESULT(I)=IEN_U_$P(NODE,U,1)_U_$P(NODE,U,3)_U_$P(NODE,U,2)_U_$E(SSN,$L(SSN)-3,$L(SSN))
 ;
 I TYPE="DOB" D
 . ; Search by date of birth
 . S IEN=0
 . F  S IEN=$O(^DPT(IEN)) Q:'IEN  Q:I>100  D
 . . S NODE=$G(^DPT(IEN,0))
 . . I $P(NODE,U,3)=+QUERY D
 . . . S I=I+1
 . . . S RESULT(I)=IEN_U_$P(NODE,U,1)_U_$P(NODE,U,3)_U_$P(NODE,U,2)_U_$E($P(NODE,U,9),$L($P(NODE,U,9))-3,$L($P(NODE,U,9)))
 ;
 S RESULT(0)=I
 Q
 ;
MERGE(RESULT,NAME,DOB,SSN) ;Duplicate detection
 ; Returns potential duplicate patients
 ;
 N U,DFN
 S U="^"
 N $ESTACK,$ETRAP S $ETRAP="D ERRTRAP^ZVEPATREG Q"
 ;
 S DFN=$$DUPCHECK($G(NAME),$G(DOB),$G(SSN))
 I DFN>0 D
 . S RESULT(0)="1^DUPLICATE_FOUND"
 . S RESULT(1)="DFN^"_DFN
 . S RESULT(2)="NAME^"_$P($G(^DPT(DFN,0)),U,1)
 . S RESULT(3)="DOB^"_$P($G(^DPT(DFN,0)),U,3)
 E  D
 . S RESULT(0)="0^NO_DUPLICATE"
 Q
 ;
DUPCHECK(NAME,DOB,SSN) ;Internal duplicate checker
 ; Returns DFN of first match, or 0
 N SRCHNAME,IEN,NODE,MATCH
 S NAME=$G(NAME),DOB=$G(DOB),SSN=$G(SSN)
 ;
 ; First check by SSN (most reliable)
 I SSN'="",$D(^DPT("SSN",SSN)) D
 . S IEN=$O(^DPT("SSN",SSN,""))
 . I IEN>0 S MATCH=IEN
 I $G(MATCH)>0 Q MATCH
 ;
 ; Then check by name + DOB
 I NAME'="" D
 . S SRCHNAME=$$UP^XLFSTR(NAME)
 . S IEN=0
 . I $D(^DPT("B",SRCHNAME)) D
 . . F  S IEN=$O(^DPT("B",SRCHNAME,IEN)) Q:'IEN  D  Q:$G(MATCH)
 . . . S NODE=$G(^DPT(IEN,0))
 . . . I +DOB>0,$P(NODE,U,3)=+DOB S MATCH=IEN
 I $G(MATCH)>0 Q MATCH
 ;
 Q 0
 ;
INSTALL ;Register RPCs in File #8994
 W !,"=== ZVEPATREG RPC Installer ==="
 D REG^ZVEUSER("VE PAT REGISTER","REGISTER","ZVEPATREG")
 D REG^ZVEUSER("VE PAT DEMOG","DEMOG","ZVEPATREG")
 D REG^ZVEUSER("VE PAT UPDATE","UPDATE","ZVEPATREG")
 D REG^ZVEUSER("VE PAT SEARCH","SEARCH","ZVEPATREG")
 D REG^ZVEUSER("VE PAT MERGE","MERGE","ZVEPATREG")
 W "ZVEPATREG RPCs registered (5 RPCs)",!
 Q
