ZVEMSGR ; VistA-Evolved MailMan RPC Bridge ;2026-02-21
 ;;1.0;VistA-Evolved;**70**;2026-02-21;
 ;
 ; Phase 70 - MailMan RPC Bridge
 ; Provides RPC entry points for secure messaging via standard MailMan APIs.
 ;
 ; RPCs:
 ;   ZVE MAIL FOLDERS  -> FOLDERS^ZVEMSGR  (list baskets)
 ;   ZVE MAIL LIST     -> LIST^ZVEMSGR     (messages in basket)
 ;   ZVE MAIL GET      -> GETMSG^ZVEMSGR   (single message detail)
 ;   ZVE MAIL SEND     -> SEND^ZVEMSGR     (send message)
 ;   ZVE MAIL MANAGE   -> MANAGE^ZVEMSGR   (mark read/delete/move)
 ;
 ; Security:
 ;   - Every entrypoint validates DUZ
 ;   - Basket/message reads scoped to DUZ only
 ;   - No cross-user mailbox access
 ;   - Message bodies returned only via GETMSG (never logged)
 ;
 ; Delivery:
 ;   TaskMan is not running in the sandbox Docker.
 ;   SEND handles inline delivery to recipient baskets.
 ;
 Q
 ;
INIT ; Set up environment variables MailMan expects
 S:'$D(U) U="^"
 S:'$D(DT) DT=$$DT^XLFDT
 Q
 ;
ERR(RES,CODE,MSG) ; Return error
 S @RES@(0)="-1"_U_CODE_U_MSG
 Q
 ;
ENSMBX(XDUZ) ; Ensure mailbox exists for a DUZ, create if needed
 Q:XDUZ'>0
 I '$D(^XMB(3.7,XDUZ,0)) D
 . N XMMSG
 . D CRE8MBOX^XMXMBOX(XDUZ,.XMMSG)
 Q
 ;
 ; ================================================================
 ;  ZVE MAIL FOLDERS - List user's baskets with message counts
 ; ================================================================
 ;  Input:  RES (by name), DUZ (from broker context)
 ;  Output: RES(0)="ok^basketCount"
 ;          RES(n)="basketId^name^totalMsgs^newMsgs"
 ;
FOLDERS(RES) ;
 N XDUZ,BK,CT,NM,TOT,NW
 D INIT
 S XDUZ=DUZ
 I XDUZ'>0 D ERR(.RES,"AUTH","DUZ not set") Q
 D ENSMBX(XDUZ)
 ;
 S CT=0,BK=""
 F  S BK=$O(^XMB(3.7,XDUZ,2,BK)) Q:BK=""  D
 . S NM=$$BSKTNAME^XMXUTIL(XDUZ,BK)
 . ; Count messages by traversal (reliable even without proper headers)
 . S TOT=$$BCOUNT(XDUZ,BK)
 . S NW=$$BNCOUNT(XDUZ,BK)
 . S CT=CT+1
 . S @RES@(CT)=BK_U_NM_U_TOT_U_NW
 ;
 S @RES@(0)="ok"_U_CT
 Q
 ;
BCOUNT(XDUZ,BK) ; Count messages in a basket by traversal
 N MN,C S MN="",C=0
 F  S MN=$O(^XMB(3.7,XDUZ,2,BK,1,MN)) Q:MN=""  S C=C+1
 Q C
 ;
BNCOUNT(XDUZ,BK) ; Count new messages in a basket
 ; New = message node value starts with date and no "read" marker
 ; In MailMan, "new" messages have a specific flag in the basket node
 N MN,C,DT0 S MN="",C=0
 F  S MN=$O(^XMB(3.7,XDUZ,2,BK,1,MN)) Q:MN=""  D
 . ; Check if message has been read by this user
 . ; A message is "new" if the basket node has no read date
 . N BVAL S BVAL=$G(^XMB(3.7,XDUZ,2,BK,1,MN,0))
 . ; Simple heuristic: if sender != DUZ and no read marker in 3.9 recipient node
 . N FDUZ S FDUZ=$P($G(^XMB(3.9,MN,0)),U,2)
 . I FDUZ'=XDUZ D
 . . ; Check recipient read date in 3.9
 . . N RN,RVAL S RN=""
 . . F  S RN=$O(^XMB(3.9,MN,1,RN)) Q:RN=""  D
 . . . S RVAL=$G(^XMB(3.9,MN,1,RN,0))
 . . . I $P(RVAL,U,1)=XDUZ,$P(RVAL,U,3)="" S C=C+1
 Q C
 ;
 ; ================================================================
 ;  ZVE MAIL LIST - List messages in a basket (metadata only)
 ; ================================================================
 ;  Input:  RES (by name), PARAM(0)=basketId, PARAM(1)=limit (optional, default 50)
 ;  Output: RES(0)="ok^count"
 ;          RES(n)="msgIEN^subject^fromDUZ^fromName^date^direction^isNew"
 ;
LIST(RES,PARAM) ;
 N XDUZ,BK,LIM,MN,CT,HDR,SUBJ,FDUZ,FNAME,MDT,DIR,ISNEW
 D INIT
 S XDUZ=DUZ
 I XDUZ'>0 D ERR(.RES,"AUTH","DUZ not set") Q
 D ENSMBX(XDUZ)
 ;
 S BK=$G(PARAM(0),1)
 S LIM=$G(PARAM(1),50)
 I LIM>200 S LIM=200
 ;
 ; Validate basket belongs to user
 I '$D(^XMB(3.7,XDUZ,2,BK)) D ERR(.RES,"NOTFOUND","Basket not found") Q
 ;
 ; Collect messages (reverse order = newest first)
 N MSGS,MORD,MI
 S MN="",CT=0,MI=0
 ; Traverse backwards for newest first
 F  S MN=$O(^XMB(3.7,XDUZ,2,BK,1,MN),-1) Q:MN=""  D  Q:CT>=LIM
 . S HDR=$G(^XMB(3.9,MN,0))
 . Q:HDR=""
 . S SUBJ=$P(HDR,U,1)
 . S FDUZ=$P(HDR,U,2)
 . S MDT=$P(HDR,U,3)
 . ; Look up sender name
 . S FNAME=""
 . I FDUZ>0 S FNAME=$P($G(^VA(200,FDUZ,0)),U,1)
 . ; Direction: outbound if from this user, inbound otherwise
 . S DIR=$S(FDUZ=XDUZ:"outbound",1:"inbound")
 . ; New status
 . S ISNEW=$$ISNEW(XDUZ,BK,MN)
 . S CT=CT+1
 . S @RES@(CT)=MN_U_SUBJ_U_FDUZ_U_FNAME_U_MDT_U_DIR_U_ISNEW
 ;
 S @RES@(0)="ok"_U_CT
 Q
 ;
ISNEW(XDUZ,BK,XMZ) ; Is message "new" for this user?
 ; Check if the user appears in the recipient list and has no read date
 N FDUZ S FDUZ=$P($G(^XMB(3.9,XMZ,0)),U,2)
 ; Messages sent BY user are never "new"
 I FDUZ=XDUZ Q 0
 ; Check recipient entries for read date
 N RN,RVAL S RN=""
 F  S RN=$O(^XMB(3.9,XMZ,1,RN)) Q:RN=""  D
 . S RVAL=$G(^XMB(3.9,XMZ,1,RN,0))
 . I $P(RVAL,U,1)=XDUZ Q
 ; If no read date found for this user, it's new
 ; For simplicity: if user is not the sender and is in the basket, check read marker
 N BVAL S BVAL=$G(^XMB(3.7,XDUZ,2,BK,1,XMZ,"R"))
 I BVAL>0 Q 0
 Q 1
 ;
 ; ================================================================
 ;  ZVE MAIL GET - Read a single message (header + body)
 ; ================================================================
 ;  Input:  RES (by name), PARAM(0)=messageIEN
 ;  Output: RES(0)="ok^msgIEN"
 ;          RES(1)="SUBJ^fromDUZ^fromName^date^direction"
 ;          RES(2..n)="BODY^lineText"
 ;          RES(n+1)="RECIP^duz^name^readDate"
 ;
GETMSG(RES,PARAM) ;
 N XDUZ,XMZ,HDR,SUBJ,FDUZ,FNAME,MDT,DIR,BL,CT
 D INIT
 S XDUZ=DUZ
 I XDUZ'>0 D ERR(.RES,"AUTH","DUZ not set") Q
 D ENSMBX(XDUZ)
 ;
 S XMZ=$G(PARAM(0))
 I XMZ'>0 D ERR(.RES,"PARAM","Invalid message IEN") Q
 ;
 ; Security: verify message is in this user's mailbox
 I '$$MSGINBOX(XDUZ,XMZ) D ERR(.RES,"ACCESS","Message not in your mailbox") Q
 ;
 S HDR=$G(^XMB(3.9,XMZ,0))
 I HDR="" D ERR(.RES,"NOTFOUND","Message not found") Q
 ;
 S SUBJ=$P(HDR,U,1)
 S FDUZ=$P(HDR,U,2)
 S FNAME="" I FDUZ>0 S FNAME=$P($G(^VA(200,FDUZ,0)),U,1)
 S MDT=$P(HDR,U,3)
 S DIR=$S(FDUZ=XDUZ:"outbound",1:"inbound")
 ;
 S @RES@(0)="ok"_U_XMZ
 S @RES@(1)="HDR"_U_SUBJ_U_FDUZ_U_FNAME_U_MDT_U_DIR
 ;
 ; Body lines
 S CT=1,BL=0
 F  S BL=$O(^XMB(3.9,XMZ,2,BL)) Q:BL=""  D
 . S CT=CT+1
 . S @RES@(CT)="BODY"_U_$G(^XMB(3.9,XMZ,2,BL,0))
 ;
 ; Recipients
 N RN,RVAL,RDUZ,RNAME,RDATE
 S RN=""
 F  S RN=$O(^XMB(3.9,XMZ,1,RN)) Q:RN=""  D
 . S RVAL=$G(^XMB(3.9,XMZ,1,RN,0))
 . S RDUZ=$P(RVAL,U,1)
 . S RNAME="" I RDUZ>0 S RNAME=$P($G(^VA(200,RDUZ,0)),U,1)
 . S RDATE=$P(RVAL,U,3)
 . S CT=CT+1
 . S @RES@(CT)="RECIP"_U_RDUZ_U_RNAME_U_RDATE
 ;
 ; Mark as read
 D MARKREAD(XDUZ,XMZ)
 Q
 ;
MSGINBOX(XDUZ,XMZ) ; Check if message is in any of user's baskets
 ; Returns 1 if found, 0 if not
 N BK,FOUND S BK="",FOUND=0
 F  S BK=$O(^XMB(3.7,XDUZ,2,BK)) Q:BK=""  D  Q:FOUND
 . I $D(^XMB(3.7,XDUZ,2,BK,1,XMZ)) S FOUND=1
 I FOUND Q 1
 ; Also check if user is sender or recipient in ^XMB(3.9)
 N FDUZ S FDUZ=$P($G(^XMB(3.9,XMZ,0)),U,2)
 I FDUZ=XDUZ Q 1
 N RN,RVAL S RN=""
 F  S RN=$O(^XMB(3.9,XMZ,1,RN)) Q:RN=""  D
 . S RVAL=$G(^XMB(3.9,XMZ,1,RN,0))
 . I $P(RVAL,U,1)=XDUZ S FOUND=1
 Q FOUND
 ;
MARKREAD(XDUZ,XMZ) ; Mark message as read for this user
 ; Set a read marker in the user's basket
 N BK S BK=""
 F  S BK=$O(^XMB(3.7,XDUZ,2,BK)) Q:BK=""  D
 . I $D(^XMB(3.7,XDUZ,2,BK,1,XMZ)) D
 . . S ^XMB(3.7,XDUZ,2,BK,1,XMZ,"R")=$$NOW^XLFDT
 Q
 ;
 ; ================================================================
 ;  ZVE MAIL SEND - Send a message via MailMan
 ; ================================================================
 ;  Input:  RES (by name), PARAM array:
 ;          PARAM("SUBJ")=subject
 ;          PARAM("TEXT",1..n)=body lines
 ;          PARAM("REC",1..n)=recipientSpec (DUZ or G.groupname)
 ;          PARAM("PRI")=priority (optional: R=routine,P=priority)
 ;  Output: RES(0)="ok^messageIEN" or "-1^code^error"
 ;
SEND(RES,PARAM) ;
 N XDUZ,XMSUBJ,XMBODY,XMTO,XMINSTR,XMZ
 D INIT
 S XDUZ=DUZ
 I XDUZ'>0 D ERR(.RES,"AUTH","DUZ not set") Q
 D ENSMBX(XDUZ)
 ;
 ; Validate subject
 S XMSUBJ=$G(PARAM("SUBJ"))
 I XMSUBJ="" D ERR(.RES,"PARAM","Subject required") Q
 I $L(XMSUBJ)<3 D ERR(.RES,"PARAM","Subject too short (min 3 chars)") Q
 I $L(XMSUBJ)>65 D ERR(.RES,"PARAM","Subject too long (max 65 chars)") Q
 ;
 ; Build body array (use global temp so XMXSEND MOVEBODY can see it)
 N I,BLINES S BLINES=0,I=""
 K ^TMP("ZVEMSGB",$J)
 F  S I=$O(PARAM("TEXT",I)) Q:I=""  D
 . S BLINES=BLINES+1
 . S ^TMP("ZVEMSGB",$J,BLINES)=$G(PARAM("TEXT",I))
 I BLINES=0 D ERR(.RES,"PARAM","Message body required") Q
 ;
 ; Build recipient array
 N RI,RCOUNT S RI="",RCOUNT=0
 F  S RI=$O(PARAM("REC",RI)) Q:RI=""  D
 . N RSPEC S RSPEC=$G(PARAM("REC",RI))
 . Q:RSPEC=""
 . S RCOUNT=RCOUNT+1
 . ; Recipients: DUZ for users, G.name for mail groups
 . I RSPEC?1.N S XMTO(+RSPEC)=""
 . E  S XMTO(RSPEC)=""
 I RCOUNT=0 D ERR(.RES,"PARAM","At least one recipient required") Q
 ;
 ; Priority
 I $G(PARAM("PRI"))="P" S XMINSTR("FLAGS")="P"
 S XMINSTR("FROM")=XDUZ
 ;
 ; Send via standard MailMan API
 N XMBREF S XMBREF=$NA(^TMP("ZVEMSGB",$J))
 D SENDMSG^XMXSEND(XDUZ,XMSUBJ,XMBREF,"XMTO",.XMINSTR,.XMZ)
 ;
 ; Clean up body temp
 K ^TMP("ZVEMSGB",$J)
 ;
 I $G(XMZ)'>0 D ERR(.RES,"SEND","MailMan send failed") Q
 ;
 ; Inline delivery since TaskMan is not running
 D DELIVER(XDUZ,XMZ)
 ;
 S @RES@(0)="ok"_U_XMZ
 Q
 ;
DELIVER(SDUZ,XMZ) ; Manually deliver message to all recipient baskets
 ; Also place in sender's own basket
 N MDT S MDT=$P($G(^XMB(3.9,XMZ,0)),U,3)
 I MDT="" S MDT=$$NOW^XLFDT
 ;
 ; Place in sender's IN basket
 D ENSMBX(SDUZ)
 I '$D(^XMB(3.7,SDUZ,2,1,1,XMZ)) D
 . S ^XMB(3.7,SDUZ,2,1,1,XMZ,0)=MDT
 ;
 ; Deliver to each direct recipient
 N RN,RVAL,RDUZ S RN=""
 F  S RN=$O(^XMB(3.9,XMZ,1,RN)) Q:RN=""  D
 . S RVAL=$G(^XMB(3.9,XMZ,1,RN,0))
 . S RDUZ=$P(RVAL,U,1)
 . I RDUZ>0,RDUZ'=SDUZ D
 . . D ENSMBX(RDUZ)
 . . I '$D(^XMB(3.7,RDUZ,2,1,1,XMZ)) D
 . . . S ^XMB(3.7,RDUZ,2,1,1,XMZ,0)=MDT
 ;
 ; Handle mail group recipients from ^XMB(3.9,XMZ) addressing
 ; Mail groups put member DUZs in the recipient list during SENDMSG
 ; so they should already be covered above
 Q
 ;
 ; ================================================================
 ;  ZVE MAIL MANAGE - Manage messages (mark read, delete, move)
 ; ================================================================
 ;  Input:  RES (by name), PARAM array:
 ;          PARAM("ACTION")= markread | delete | move
 ;          PARAM("XMZ")=messageIEN
 ;          PARAM("BASKET")=current basket (for delete/move)
 ;          PARAM("TOBASKET")=target basket (for move only)
 ;  Output: RES(0)="ok^action" or "-1^code^error"
 ;
MANAGE(RES,PARAM) ;
 N XDUZ,ACTION,XMZ,BK,TBK
 D INIT
 S XDUZ=DUZ
 I XDUZ'>0 D ERR(.RES,"AUTH","DUZ not set") Q
 D ENSMBX(XDUZ)
 ;
 S ACTION=$G(PARAM("ACTION"))
 S XMZ=$G(PARAM("XMZ"))
 S BK=$G(PARAM("BASKET"),1)
 ;
 I XMZ'>0 D ERR(.RES,"PARAM","Message IEN required") Q
 I '$$MSGINBOX(XDUZ,XMZ) D ERR(.RES,"ACCESS","Message not in your mailbox") Q
 ;
 I ACTION="markread" D  Q
 . D MARKREAD(XDUZ,XMZ)
 . S @RES@(0)="ok"_U_"markread"
 ;
 I ACTION="delete" D  Q
 . ; Move to WASTE basket (.5)
 . I $D(^XMB(3.7,XDUZ,2,BK,1,XMZ)) D
 . . K ^XMB(3.7,XDUZ,2,BK,1,XMZ)
 . . S ^XMB(3.7,XDUZ,2,.5,1,XMZ,0)=$$NOW^XLFDT
 . S @RES@(0)="ok"_U_"delete"
 ;
 I ACTION="move" D  Q
 . S TBK=$G(PARAM("TOBASKET"))
 . I TBK="" D ERR(.RES,"PARAM","Target basket required for move") Q
 . I '$D(^XMB(3.7,XDUZ,2,TBK)) D ERR(.RES,"NOTFOUND","Target basket not found") Q
 . I $D(^XMB(3.7,XDUZ,2,BK,1,XMZ)) D
 . . K ^XMB(3.7,XDUZ,2,BK,1,XMZ)
 . . S ^XMB(3.7,XDUZ,2,TBK,1,XMZ,0)=$$NOW^XLFDT
 . S @RES@(0)="ok"_U_"move"
 ;
 D ERR(.RES,"PARAM","Unknown action: "_ACTION)
 Q
