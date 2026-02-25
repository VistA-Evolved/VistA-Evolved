ZVEADT	;VistA-Evolved/ADT -- Ward Census + Bed Board + Movement History
	;;1.0;VistA-Evolved ADT Bridge;Phase 137
	;
	; PURPOSE: Custom RPC entry points for inpatient ADT operational views.
	; VistA-first: reads existing FileMan structures, never writes.
	;
	; Entry Points (registered as RPCs):
	;   WARDS^ZVEADT  -> ZVEADT WARDS    -- Ward census with bed counts
	;   BEDS^ZVEADT   -> ZVEADT BEDS     -- Bed-level occupancy for a ward
	;   MVHIST^ZVEADT -> ZVEADT MVHIST   -- Movement history for a patient
	;
	; Files Read:
	;   ^DIC(42)      -- WARD LOCATION
	;   ^DIC(42.4)    -- ROOM-BED
	;   ^DGPM(405)    -- PATIENT MOVEMENT
	;   ^DGPM(405.1)  -- PATIENT MOVEMENT TYPE
	;   ^DPT(          -- PATIENT (File 2)
	;
	; Install: docker cp ZVEADT.m wv:/tmp/ then:
	;   mumps -r INSTALL^ZVEADT
	;
	Q
	;
	; ---- WARDS: Ward list with bed counts and census ----
	; Returns: WARD_IEN^NAME^TOTAL_BEDS^OCCUPIED^EMPTY
	;
WARDS(RESULT,DUMMY)	;
	N I,WRD,CNT,RCNT,BEDS,OCC,EMP,BED,NODE
	K RESULT S RCNT=0
	; Loop through WARD LOCATION file (42)
	S I=0 F  S I=$O(^DIC(42,I)) Q:'I  D
	. S WRD=$P($G(^DIC(42,I,0)),"^",1) Q:WRD=""
	. ; Count beds for this ward from ROOM-BED (42.4)
	. S BEDS=0,OCC=0
	. S BED=0 F  S BED=$O(^DIC(42.4,BED)) Q:'BED  D
	. . S NODE=$G(^DIC(42.4,BED,0))
	. . ; Piece 2 of ROOM-BED is the ward pointer
	. . Q:$P(NODE,"^",2)'=I
	. . S BEDS=BEDS+1
	. . ; Check occupancy: piece 3 is current patient (if any)
	. . I $P(NODE,"^",3)]"" S OCC=OCC+1
	. S EMP=BEDS-OCC
	. S RCNT=RCNT+1
	. S RESULT(RCNT)=I_"^"_WRD_"^"_BEDS_"^"_OCC_"^"_EMP
	S RESULT(0)=RCNT
	Q
	;
	; ---- BEDS: Bed-level occupancy for a specific ward ----
	; Input: WARD = ward IEN (File 42)
	; Returns: BED_IEN^ROOM_BED_NAME^STATUS^PATIENT_DFN^PATIENT_NAME
	;   STATUS: occupied | empty | oos (out-of-service)
	;
BEDS(RESULT,WARD)	;
	N I,NODE,RM,STAT,DFN,PNAME,RCNT
	K RESULT S RCNT=0
	Q:'$G(WARD)
	S I=0 F  S I=$O(^DIC(42.4,I)) Q:'I  D
	. S NODE=$G(^DIC(42.4,I,0))
	. ; Filter to requested ward (piece 2)
	. Q:$P(NODE,"^",2)'=WARD
	. S RM=$P(NODE,"^",1)
	. S DFN=$P(NODE,"^",3)
	. I DFN]"" D
	. . S PNAME=$P($G(^DPT(DFN,0)),"^",1)
	. . S STAT="occupied"
	. E  D
	. . S PNAME="",STAT="empty"
	. ; Check out-of-service flag (piece 4 if present)
	. I $P(NODE,"^",4)="Y" S STAT="oos"
	. S RCNT=RCNT+1
	. S RESULT(RCNT)=I_"^"_RM_"^"_STAT_"^"_DFN_"^"_PNAME
	S RESULT(0)=RCNT
	Q
	;
	; ---- MVHIST: Patient movement history ----
	; Input: DFN = patient DFN
	; Returns: DATE^TYPE^FROM^TO^WARD^ROOM_BED^PROVIDER
	;   DATE in FM internal format
	;   TYPE: ADMIT | TRANSFER | DISCHARGE | PASS | RETURN
	;
MVHIST(RESULT,DFN)	;
	N MVDT,MV,NODE,MTYPE,MTNAME,FROM,TO,WRD,RB,PROV,RCNT
	K RESULT S RCNT=0
	Q:'$G(DFN)
	; PATIENT MOVEMENT (405) is indexed by patient
	; ^DGPM("APTT",DFN,date,ien)
	S MVDT=0 F  S MVDT=$O(^DGPM("APTT",DFN,MVDT)) Q:'MVDT  D
	. S MV=0 F  S MV=$O(^DGPM("APTT",DFN,MVDT,MV)) Q:'MV  D
	. . S NODE=$G(^DGPM(405,MV,0))
	. . Q:NODE=""
	. . ; Piece 1: date/time, Piece 2: transaction type
	. . ; Piece 3: ward (File 42 pointer)
	. . ; Piece 4: room-bed (File 42.4 pointer)
	. . S MTYPE=$P(NODE,"^",2)
	. . S MTNAME=""
	. . I MTYPE]"" S MTNAME=$P($G(^DGPM(405.1,MTYPE,0)),"^",1)
	. . S WRD=$P(NODE,"^",3)
	. . I WRD]"" S WRD=$P($G(^DIC(42,WRD,0)),"^",1)
	. . S RB=$P(NODE,"^",4)
	. . I RB]"" S RB=$P($G(^DIC(42.4,RB,0)),"^",1)
	. . ; Provider from extended node
	. . S PROV=$P($G(^DGPM(405,MV,"P")),"^",1)
	. . I PROV]"" S PROV=$P($G(^VA(200,PROV,0)),"^",1)
	. . S RCNT=RCNT+1
	. . S RESULT(RCNT)=$P(NODE,"^",1)_"^"_MTNAME_"^"_""_"^"_""_"^"_WRD_"^"_RB_"^"_PROV
	S RESULT(0)=RCNT
	Q
	;
	; ---- INSTALL: Register RPCs in VistA ----
	; Run: mumps -r INSTALL^ZVEADT
	;
INSTALL	;
	N RNAME,RTAG,RRTN
	W !,"=== ZVEADT RPC Installer ==="
	W !,"Registering 3 ADT RPCs..."
	;
	; 1. ZVEADT WARDS
	D ADDRPC("ZVEADT WARDS","WARDS","ZVEADT")
	; 2. ZVEADT BEDS
	D ADDRPC("ZVEADT BEDS","BEDS","ZVEADT")
	; 3. ZVEADT MVHIST
	D ADDRPC("ZVEADT MVHIST","MVHIST","ZVEADT")
	;
	W !,"Done. 3 RPCs registered."
	W !,"Add to OR CPRS GUI CHART context with VEMCTX3.m"
	Q
	;
ADDRPC(RNAME,RTAG,RRTN)	;
	; Add/update RPC in REMOTE PROCEDURE file (8994)
	N IEN,FDA,ERR,IENS
	; Check if already exists
	S IEN=$O(^XWB(8994,"B",RNAME,""))
	I IEN]"" D  Q
	. W !,"  RPC ",RNAME," already exists (IEN=",IEN,")"
	;
	; Create new entry
	S IENS="+1,"
	S FDA(8994,IENS,.01)=RNAME
	S FDA(8994,IENS,.02)=RTAG
	S FDA(8994,IENS,.03)=RRTN
	S FDA(8994,IENS,.04)="B"  ; Type = Broker
	D UPDATE^DIE("","FDA","","ERR")
	I $D(ERR) D
	. W !,"  ERROR registering ",RNAME,": ",$G(ERR("DIERR",1,"TEXT",1))
	E  D
	. W !,"  Registered: ",RNAME," [",RTAG,"^",RRTN,"]"
	Q
