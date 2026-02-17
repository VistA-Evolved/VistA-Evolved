VEMCTX ;VE/KM - Add VE RPCs to context;2026-02-17
 ;
 ; Adds VE INTEROP RPCs to the OR CPRS GUI CHART context
 ; so the RPC broker client can call them.
 ;
 N CTXIEN,RPCIEN,RPCNM,NAMES,I
 ;
 ; Find OR CPRS GUI CHART context (option file 19)
 S CTXIEN=$$FIND1^DIC(19,,"B","OR CPRS GUI CHART")
 I CTXIEN<1 D  Q
 . W "ERROR: OR CPRS GUI CHART not found in file 19",!
 ;
 W "OR CPRS GUI CHART found at IEN=",CTXIEN,!
 ;
 S NAMES="VE INTEROP HL7 LINKS,VE INTEROP HL7 MSGS,VE INTEROP HLO STATUS,VE INTEROP QUEUE DEPTH"
 ;
 F I=1:1:4 D
 . S RPCNM=$P(NAMES,",",I)
 . S RPCIEN=$$FIND1^DIC(8994,,"B",RPCNM)
 . I RPCIEN<1 D  Q
 . . W "  SKIP: RPC '",RPCNM,"' not found in file 8994",!
 . ;
 . ; Check if already in the RPC multiple (field 7827 of file 19)
 . ; The RPC multiple is stored at ^DIC(19,CTXIEN,"RPC",*)
 . N FOUND,SUBIEN S FOUND=0
 . S SUBIEN=0
 . F  S SUBIEN=$O(^DIC(19,CTXIEN,"RPC",SUBIEN)) Q:SUBIEN=""  D
 . . I $P($G(^DIC(19,CTXIEN,"RPC",SUBIEN,0)),"^",1)=RPCIEN S FOUND=1
 . ;
 . I FOUND D  Q
 . . W "  ALREADY: ",RPCNM," already in context",!
 . ;
 . ; Add the RPC to the context's RPC multiple
 . ; Find next available sub-IEN
 . N NEXTIEN S NEXTIEN=$O(^DIC(19,CTXIEN,"RPC",""),-1)+1
 . S ^DIC(19,CTXIEN,"RPC",NEXTIEN,0)=RPCIEN
 . S ^DIC(19,CTXIEN,"RPC",0)="^19.05PA^"_NEXTIEN_"^"_NEXTIEN
 . W "  ADDED: ",RPCNM," (RPC IEN=",RPCIEN,", sub-IEN=",NEXTIEN,")",!
 ;
 W !,"Done. Context now includes VE INTEROP RPCs.",!
 Q
