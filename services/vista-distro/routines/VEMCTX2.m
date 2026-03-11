VEMCTX2 ;VE/KM - Fix context registration;2026-02-17
 ;
 N CTXIEN,RPCIEN,RPCNM,NAMES,I,MAXSUB,SUBIEN,N0
 ;
 S CTXIEN=$$FIND1^DIC(19,,"B","OR CPRS GUI CHART")
 W "Context IEN: ",CTXIEN,!
 ;
 ; First, show current RPC entries
 W !,"Current RPC entries in context:",!
 S SUBIEN=0
 F  S SUBIEN=$O(^DIC(19,CTXIEN,"RPC",SUBIEN)) Q:SUBIEN=""  Q:SUBIEN=0  D
 . Q:SUBIEN="B"  Q:SUBIEN="AC"
 . S N0=$G(^DIC(19,CTXIEN,"RPC",SUBIEN,0))
 . W "  sub-IEN=",SUBIEN," => RPC IEN=",N0,!
 ;
 ; Now fix: Delete and re-add properly
 ; Kill existing VE entries
 W !,"Cleaning and re-adding VE RPCs...",!
 K ^DIC(19,CTXIEN,"RPC")
 ;
 S NAMES="VE INTEROP HL7 LINKS,VE INTEROP HL7 MSGS,VE INTEROP HLO STATUS,VE INTEROP QUEUE DEPTH"
 ;
 F I=1:1:4 D
 . S RPCNM=$P(NAMES,",",I)
 . S RPCIEN=$$FIND1^DIC(8994,,"B",RPCNM)
 . I RPCIEN<1 W "  SKIP: ",RPCNM," not found",! Q
 . S ^DIC(19,CTXIEN,"RPC",I,0)=RPCIEN
 . W "  Added ",RPCNM," (RPC IEN=",RPCIEN,") at sub-IEN=",I,!
 ;
 ; Set the header node
 S ^DIC(19,CTXIEN,"RPC",0)="^19.05PA^4^4"
 ;
 W !,"Verify final state:",!
 S SUBIEN=0
 F  S SUBIEN=$O(^DIC(19,CTXIEN,"RPC",SUBIEN)) Q:SUBIEN=""  Q:SUBIEN=0  D
 . Q:SUBIEN="B"  Q:SUBIEN="AC"
 . S N0=$G(^DIC(19,CTXIEN,"RPC",SUBIEN,0))
 . S RPCNM=""
 . I N0>0 S RPCNM=$P($G(^XTV(8994,N0,0)),"^",1)
 . W "  sub-IEN=",SUBIEN," => RPC IEN=",N0," (",RPCNM,")",!
 W !,"Done.",!
 Q
