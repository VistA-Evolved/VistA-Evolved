ZVEMPR6 ; MailMan Final Probe ;2026-02-21
 ;
EN ;
 N DUZ S DUZ=87
 S U="^"
 S DT=$$DT^XLFDT
 ;
 ; Fix basket 0 header if needed
 I '$D(^XMB(3.7,DUZ,2,0,0)) S ^XMB(3.7,DUZ,2,0,0)="^3.7012"
 ;
 ; Check IN basket (1)
 W "IN basket count: "_$$BMSGCT^XMXUTIL(DUZ,1),!
 W "IN basket new: "_$$BNMSGCT^XMXUTIL(DUZ,1),!
 W "WASTE basket count: "_$$BMSGCT^XMXUTIL(DUZ,.5),!
 ;
 ; Send another test via FULL XMXSEND with proper env
 W !,"=== Sending with full env ===",!
 N XMSUBJ,XMBODY,XMTO,XMINSTR,XMZ
 S XMSUBJ="Phase 70 Inbox Test"
 S XMBODY(1)="Testing inbox delivery."
 S XMBODY(2)="Second line."
 ; Send to DUZ 87
 S XMTO(87)=""
 S XMINSTR("FROM")=DUZ
 D SENDMSG^XMXSEND(DUZ,XMSUBJ,"XMBODY","XMTO",.XMINSTR,.XMZ)
 W "New XMZ: "_$G(XMZ),!
 ;
 ; Check if msg ended up in basket
 I $G(XMZ)>0 D
 . W "3.9,"_XMZ_",0: "_$G(^XMB(3.9,XMZ,0)),!
 . ; Check all baskets for this msg
 . N BK S BK=""
 . F  S BK=$O(^XMB(3.7,DUZ,2,BK)) Q:BK=""  D
 . . I $D(^XMB(3.7,DUZ,2,BK,1,XMZ)) W "Found in basket "_BK,!
 . ;
 . ; Maybe delivery needs XMD background job. Check XMD queue.
 . W !,"Check ^XMB(2 delivery queue: "_$D(^XMB(2)),!
 . W "^XMB(2,XMZ): "_$D(^XMB(2,XMZ)),!
 . I $D(^XMB(2,XMZ)) W "Msg "_XMZ_" is in delivery queue!",!
 ;
 ; Force delivery by running XMD
 ; XMD is the MailMan delivery routine
 W !,"=== Attempting manual delivery ===",!
 I $G(XMZ)>0,$D(^XMB(2,XMZ)) D
 . D ^XMD
 . W "After XMD run:",!
 . N BK2 S BK2=""
 . F  S BK2=$O(^XMB(3.7,DUZ,2,BK2)) Q:BK2=""  D
 . . I $D(^XMB(3.7,DUZ,2,BK2,1,XMZ)) W "NOW found in basket "_BK2,!
 E  D
 . W "No pending delivery found, checking alternative...",!
 . ; Try running XMD anyway for any pending msgs
 . D ^XMD
 ;
 ; Recheck
 W !,"=== Final Basket State ===",!
 N BK3 S BK3=""
 F  S BK3=$O(^XMB(3.7,DUZ,2,BK3)) Q:BK3=""  D
 . W "Basket "_BK3_" ("_$$BSKTNAME^XMXUTIL(DUZ,BK3)_"):",!
 . N MN,MC S MN="",MC=0
 . F  S MN=$O(^XMB(3.7,DUZ,2,BK3,1,MN)) Q:MN=""  D  Q:MC>20
 . . S MC=MC+1
 . . N HDR S HDR=$G(^XMB(3.9,MN,0))
 . . W "  Msg "_MN_": "_$P(HDR,U,1)_" from "_$P(HDR,U,2)_" date "_$P(HDR,U,3),!
 ;
 W "Total: "_$$TMSGCT^XMXUTIL(DUZ),!
 W "New: "_$$TNMSGCT^XMXUTIL(DUZ),!
 W !,"DONE",!
 Q
