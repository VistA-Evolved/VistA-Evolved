ZVERPC ;VE/KM - VistA-Evolved RPC Catalog Lister;2026-02-20
 ;;1.0;VistA-Evolved;**1**;Feb 20, 2026;Build 1
 ;
 ; Lists all registered RPCs from File 8994 (REMOTE PROCEDURE).
 ; Returns: pipe-delimited lines: IEN|NAME|TAG|ROUTINE
 ;
 ; Called via RPC: VE LIST RPCS
 ; Entry point: LIST^ZVERPC
 ;
 Q
 ;
LIST(RESULT,DUMMY) ; List all RPCs in File 8994
 ; RESULT = return array (by reference)
 ; Format: IEN|NAME|TAG|ROUTINE
 ;
 N IEN,NAME,TAG,RTN,CNT
 S CNT=0
 S IEN=0
 F  S IEN=$O(^XWB(8994,IEN)) Q:IEN'>0  D
 . S NAME=$P($G(^XWB(8994,IEN,0)),"^",1)
 . Q:NAME=""
 . S TAG=$P($G(^XWB(8994,IEN,0)),"^",2)
 . S RTN=$P($G(^XWB(8994,IEN,0)),"^",3)
 . S CNT=CNT+1
 . S RESULT(CNT)=IEN_"|"_NAME_"|"_TAG_"|"_RTN
 ;
 S RESULT(0)=CNT
 Q
 ;
INSTALL ; Register the VE LIST RPCS RPC
 N IEN,FDA,IENS,ERRS
 ;
 S IEN=$$FIND1^DIC(8994,,"BX","VE LIST RPCS")
 I IEN>0 D  Q
 . W !,"RPC 'VE LIST RPCS' already registered (IEN="_IEN_"), skipping."
 ;
 W !,"Registering RPC: VE LIST RPCS..."
 ;
 S IENS="+1,"
 S FDA(8994,IENS,.01)="VE LIST RPCS"
 S FDA(8994,IENS,.02)="LIST"
 S FDA(8994,IENS,.03)="ZVERPC"
 S FDA(8994,IENS,.04)=2  ; ARRAY return type
 ;
 D UPDATE^DIE("E","FDA","","ERRS")
 ;
 I $D(ERRS) D  Q
 . W !,"  ** ERROR: ",$G(ERRS("DIERR",1,"TEXT",1)),!
 ;
 S IEN=$$FIND1^DIC(8994,,"BX","VE LIST RPCS")
 W "  OK (IEN="_IEN_")",!
 ;
 ; Add to OR CPRS GUI CHART context
 D ADDCTX
 Q
 ;
ADDCTX ; Add VE LIST RPCS to OR CPRS GUI CHART context
 ; Uses safe append pattern from VEMCTX3
 N CTXIEN,RPCIEN,SUBIEN,MAX
 ;
 ; Find context option IEN
 S CTXIEN=$$FIND1^DIC(19,,"B","OR CPRS GUI CHART")
 I CTXIEN'>0 W !,"  Context OR CPRS GUI CHART not found",! Q
 ;
 ; Find RPC IEN
 S RPCIEN=$$FIND1^DIC(8994,,"BX","VE LIST RPCS")
 I RPCIEN'>0 W !,"  RPC VE LIST RPCS not found",! Q
 ;
 ; Check if already in context
 S SUBIEN=0
 F  S SUBIEN=$O(^DIC(19,CTXIEN,"RPC",SUBIEN)) Q:SUBIEN'>0  D
 . I $P($G(^DIC(19,CTXIEN,"RPC",SUBIEN,0)),"^",1)=RPCIEN S SUBIEN=-1
 I SUBIEN=-1 W !,"  Already in context",! Q
 ;
 ; Find max sub-IEN and append (never KILL)
 S MAX=0
 S SUBIEN=0
 F  S SUBIEN=$O(^DIC(19,CTXIEN,"RPC",SUBIEN)) Q:SUBIEN'>0  S MAX=SUBIEN
 S MAX=MAX+1
 ;
 S ^DIC(19,CTXIEN,"RPC",MAX,0)=RPCIEN
 S ^DIC(19,CTXIEN,"RPC","B",RPCIEN,MAX)=""
 ;
 ; Update zero node count
 N CT S CT=0
 S SUBIEN=0
 F  S SUBIEN=$O(^DIC(19,CTXIEN,"RPC",SUBIEN)) Q:SUBIEN'>0  S CT=CT+1
 S ^DIC(19,CTXIEN,"RPC",0)="^^"_CT_"^"_CT_"^"
 ;
 W !,"  Added to context (sub-IEN "_MAX_")",!
 Q
 ;
CHECK ; Verify registration
 N IEN
 S IEN=$$FIND1^DIC(8994,,"BX","VE LIST RPCS")
 W !,"VE LIST RPCS => ",$S(IEN>0:"REGISTERED (IEN="_IEN_")",1:"NOT FOUND")
 Q
