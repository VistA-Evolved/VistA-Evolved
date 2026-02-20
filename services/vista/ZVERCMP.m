ZVERCMP ;VistA-Evolved;RCM Provider Info Wrapper;Phase 42
 ;;1.0;VistA-Evolved RCM Provider Info;
 ;
 ; VE RCM PROVIDER INFO -- Read-only wrapper RPC
 ; Returns provider NPI + facility identifiers for claim drafting.
 ;
 ; Input:  RESULTS (pass by reference), DUZ (provider IEN)
 ; Output: RESULTS(0)=count, RESULTS(1..N)=delimited lines
 ;
 ; Format: PROVIDER_NAME^NPI^FACILITY_NAME^FACILITY_IEN^STATION_NUMBER
 ;
 ; Files read (all read-only):
 ;   ^VA(200,DUZ,0)       -- Provider name
 ;   ^VA(200,DUZ,41.99)   -- NPI (New Person NPI field)
 ;   ^DIC(4,IEN,0)        -- Institution name
 ;   ^DIC(4,IEN,99)       -- Station number
 ;   ^XMB("NETNAME")      -- Facility domain (fallback)
 ;
 ; Safety: Read-only. No KILL, no SET to VistA globals.
 ;         Returns empty fields for missing data (never errors).
 ;
LIST(RESULTS,DUZ) ;
 N NAME,NPI,FACNAME,FACIEN,STATNUM
 S RESULTS(0)=1
 ;
 ; -- Provider name from ^VA(200,DUZ,0)
 S NAME=""
 I $D(^VA(200,DUZ,0)) S NAME=$P($G(^VA(200,DUZ,0)),"^",1)
 ;
 ; -- NPI from ^VA(200,DUZ,41.99)
 S NPI=""
 I $D(^VA(200,DUZ,41.99)) S NPI=$G(^VA(200,DUZ,41.99))
 ; Older VistA may store NPI in VA(200,DUZ,"NPI") or VA(200,DUZ,41.99)
 I NPI="" S NPI=$P($G(^VA(200,DUZ,"NPI")),"^",1)
 ;
 ; -- Facility: get DUZ(2) institution pointer
 S FACIEN=$G(DUZ(2))
 I FACIEN="" S FACIEN=$P($G(^VA(200,DUZ,2.1)),"^",1)
 ;
 S FACNAME="",STATNUM=""
 I FACIEN'="" D
 . I $D(^DIC(4,FACIEN,0)) S FACNAME=$P($G(^DIC(4,FACIEN,0)),"^",1)
 . S STATNUM=$P($G(^DIC(4,FACIEN,99)),"^",1)
 ;
 S RESULTS(1)=NAME_"^"_NPI_"^"_FACNAME_"^"_FACIEN_"^"_STATNUM
 Q
 ;
INSTALL ;Install VE RCM PROVIDER INFO RPC into File 8994
 ; Idempotent: checks if already installed, skips if found.
 N IEN,FOUND,MAXIEN,NAME
 S NAME="VE RCM PROVIDER INFO"
 ;
 ; Check if already registered
 S FOUND=0
 S IEN="" F  S IEN=$O(^XWB(8994,IEN)) Q:IEN=""  D  Q:FOUND
 . I $P($G(^XWB(8994,IEN,0)),"^",1)=NAME S FOUND=IEN
 ;
 I FOUND>0 D  Q
 . W !,"VE RCM PROVIDER INFO already registered at IEN "_FOUND
 ;
 ; Find max IEN and append
 S MAXIEN=0
 S IEN="" F  S IEN=$O(^XWB(8994,IEN)) Q:IEN=""  I IEN>MAXIEN S MAXIEN=IEN
 S IEN=MAXIEN+1
 ;
 ; Register the RPC
 S ^XWB(8994,IEN,0)=NAME_"^ZVERCMP^LIST^1^^0^^0"
 S ^XWB(8994,IEN,.1)="RCM Provider/Facility info for claim drafts (Phase 42)"
 ;
 ; Update header node
 S ^XWB(8994,0)="REMOTE PROCEDURE^"_IEN_"^"_IEN
 ;
 W !,"VE RCM PROVIDER INFO registered at IEN "_IEN
 Q
