ZVEMSIN ; VistA-Evolved MailMan RPC Installer ;2026-02-21
 ;;1.0;VistA-Evolved;**70**;2026-02-21;
 ;
 ; Registers ZVE MAIL * RPCs in File 8994  and adds to OR CPRS GUI CHART context.
 ; Safe: checks for existing entries, never overwrites, appends only.
 ;
 Q
 ;
EN ;
 N RPCS,I,RPCNM,RPCTAG,RPCIEN,CTXIEN,MAXSUB
 S U="^"
 ;
 ; Define RPCs to register: name^routine^tag^description
 S RPCS(1)="ZVE MAIL FOLDERS^ZVEMSGR^FOLDERS^List user mail baskets with counts"
 S RPCS(2)="ZVE MAIL LIST^ZVEMSGR^LIST^List messages in a basket"
 S RPCS(3)="ZVE MAIL GET^ZVEMSGR^GETMSG^Read single message header and body"
 S RPCS(4)="ZVE MAIL SEND^ZVEMSGR^SEND^Send message via MailMan"
 S RPCS(5)="ZVE MAIL MANAGE^ZVEMSGR^MANAGE^Manage messages (mark read, delete, move)"
 ;
 ; Register each RPC in File 8994
 F I=1:1:5 D
 . N NM,RTN,TAG,DESC,FDA,IEN,DIERR
 . S NM=$P(RPCS(I),U,1)
 . S RTN=$P(RPCS(I),U,2)
 . S TAG=$P(RPCS(I),U,3)
 . S DESC=$P(RPCS(I),U,4)
 . ;
 . ; Check if already registered
 . S RPCIEN=$O(^XWB(8994,"B",NM,""))
 . I RPCIEN>0 D  Q
 . . W "  SKIP: "_NM_" already exists (IEN "_RPCIEN_")",!
 . ;
 . ; Create via FileMan (skip WP description field to avoid INDEXTRACHARS)
 . K FDA,IEN,DIERR
 . S FDA(8994,"+1,",.01)=NM
 . S FDA(8994,"+1,",.02)=TAG
 . S FDA(8994,"+1,",.03)=RTN
 . S FDA(8994,"+1,",.04)="B"  ; Return value type: ARRAY
 . D UPDATE^DIE("","FDA","IEN")
 . I $D(DIERR) D  Q
 . . W "  ERROR registering "_NM_": "_$G(^TMP("DIERR",$J,1,"TEXT",1)),!
 . S RPCIEN=$G(IEN(1))
 . W "  OK: "_NM_" registered (IEN "_RPCIEN_")",!
 ;
 ; Add all to OR CPRS GUI CHART context (File 19, option #101)
 W !,"Adding RPCs to OR CPRS GUI CHART context...",!
 S CTXIEN=$O(^DIC(19,"B","OR CPRS GUI CHART",""))
 I CTXIEN="" W "  ERROR: OR CPRS GUI CHART option not found!",! Q
 W "  Context IEN: "_CTXIEN,!
 ;
 ; Find max sub-IEN in the RPC multiple
 S MAXSUB=0
 N SUB S SUB=""
 F  S SUB=$O(^DIC(19,CTXIEN,"RPC",SUB)) Q:SUB=""  D
 . I SUB>MAXSUB,SUB=+SUB S MAXSUB=SUB
 W "  Current max RPC sub-IEN: "_MAXSUB,!
 ;
 F I=1:1:5 D
 . N NM,RIEN
 . S NM=$P(RPCS(I),U,1)
 . S RIEN=$O(^XWB(8994,"B",NM,""))
 . I RIEN="" W "  SKIP context add for "_NM_" (no IEN)",! Q
 . ;
 . ; Check if already in context
 . N FOUND,CSN S FOUND=0,CSN=""
 . F  S CSN=$O(^DIC(19,CTXIEN,"RPC",CSN)) Q:CSN=""  D
 . . I $P($G(^DIC(19,CTXIEN,"RPC",CSN,0)),U,1)=RIEN S FOUND=1
 . I FOUND W "  SKIP context: "_NM_" already in context",! Q
 . ;
 . ; Append
 . S MAXSUB=MAXSUB+1
 . S ^DIC(19,CTXIEN,"RPC",MAXSUB,0)=RIEN
 . S ^DIC(19,CTXIEN,"RPC","B",RIEN,MAXSUB)=""
 . W "  OK: "_NM_" added to context (sub-IEN "_MAXSUB_")",!
 ;
 ; Update the RPC multiple header
 N HDRVAL S HDRVAL=$G(^DIC(19,CTXIEN,"RPC",0))
 S $P(HDRVAL,U,3)=MAXSUB
 S $P(HDRVAL,U,4)=MAXSUB
 S ^DIC(19,CTXIEN,"RPC",0)=HDRVAL
 ;
 W !,"=== Verification ===",!
 F I=1:1:5 D
 . N NM,RIEN
 . S NM=$P(RPCS(I),U,1)
 . S RIEN=$O(^XWB(8994,"B",NM,""))
 . W "  "_NM_": IEN="_$G(RIEN,"MISSING"),!
 ;
 W !,"DONE - ZVE MAIL RPCs installed.",!
 Q
