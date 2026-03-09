VEMCTX3 ;VE/KM - Safely add VE RPCs to context;2026-03-08
 ;
 ; SAFE version: adds VE RPCs to context WITHOUT touching existing entries.
 ; Finds max existing sub-IEN and appends starting from max+1.
 ;
 N CTXIEN,RPCIEN,RPCNM,NAMES,I,MAXSUB,SUBIEN,FOUND,NEXT,HDR,EXISTCT,ADDEDCT,TOTALCT
 ;
 S CTXIEN=$$FIND1^DIC(19,,"B","OR CPRS GUI CHART")
 I CTXIEN<1 W "ERROR: OR CPRS GUI CHART not found",! Q
 W "Context IEN: ",CTXIEN,!
 ;
 ; Find the current max sub-IEN in the RPC multiple
 S MAXSUB=0,SUBIEN=""
 F  S SUBIEN=$O(^DIC(19,CTXIEN,"RPC",SUBIEN)) Q:SUBIEN=""  D
 . Q:SUBIEN'=+SUBIEN  ; skip non-numeric subscripts like "B", "AC"
 . I SUBIEN>MAXSUB S MAXSUB=SUBIEN
 ;
 W "Current max sub-IEN in RPC list: ",MAXSUB,!
 ;
 ; Count existing entries
 S EXISTCT=0,SUBIEN=0
 F  S SUBIEN=$O(^DIC(19,CTXIEN,"RPC",SUBIEN)) Q:SUBIEN=""  D
 . Q:SUBIEN'=+SUBIEN
 . S EXISTCT=EXISTCT+1
 W "Existing RPC entries: ",EXISTCT,!
 ;
 S NAMES="VE INTEROP HL7 LINKS,VE INTEROP HL7 MSGS,VE INTEROP HLO STATUS,VE INTEROP QUEUE DEPTH,VE INTEROP MSG LIST,VE INTEROP MSG DETAIL,VE PROBLEM ADD"
 S NEXT=MAXSUB
 S ADDEDCT=0
 ;
 F I=1:1:$L(NAMES,",") D
 . S RPCNM=$P(NAMES,",",I)
 . S RPCIEN=$$FIND1^DIC(8994,,"B",RPCNM)
 . I RPCIEN<1 W "  SKIP: ",RPCNM," not found (need to register first)",! Q
 . ;
 . ; Check if already in context
 . S FOUND=0,SUBIEN=0
 . F  S SUBIEN=$O(^DIC(19,CTXIEN,"RPC",SUBIEN)) Q:SUBIEN=""  D
 . . Q:SUBIEN'=+SUBIEN
 . . I +$G(^DIC(19,CTXIEN,"RPC",SUBIEN,0))=RPCIEN S FOUND=1
 . ;
 . I FOUND W "  ALREADY: ",RPCNM,!  Q
 . ;
 . S NEXT=NEXT+1
 . S ^DIC(19,CTXIEN,"RPC",NEXT,0)=RPCIEN
 . S ADDEDCT=ADDEDCT+1
 . W "  ADDED: ",RPCNM," (RPC IEN=",RPCIEN,") at sub-IEN=",NEXT,!
 ;
 ; Update the header node count
 S TOTALCT=EXISTCT+ADDEDCT
 S HDR=$G(^DIC(19,CTXIEN,"RPC",0))
 I HDR="" S HDR="^19.05PA^"_NEXT_"^"_NEXT
 E  S $P(HDR,"^",3)=NEXT,$P(HDR,"^",4)=TOTALCT
 S ^DIC(19,CTXIEN,"RPC",0)=HDR
 ;
 W !,"Done. Header: ",HDR,!
 Q
