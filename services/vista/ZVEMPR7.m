ZVEMPR7 ; MailMan Delivery Probe ;2026-02-21
 ;
EN ;
 N DUZ S DUZ=87
 S U="^"
 S DT=$$DT^XLFDT
 ;
 ; Check delivery mechanism - look at XMD entry points
 W "=== XMD Entry Points ===",!
 N J,LN
 F J=1:1:60 D
 . S LN=$T(+J^XMD) Q:LN=""
 . I $E(LN)'=" " W J_": "_$E(LN,1,70),!
 ;
 ; Check XMXSEND more carefully - the delivery part
 W !,"=== XMXSEND lines around delivery ===",!
 F J=40:1:100 D
 . S LN=$T(+J^XMXSEND) Q:LN=""
 . W J_": "_$E(LN,1,80),!
 ;
 ; Try manual delivery by putting msg into basket directly
 ; In MailMan, basket 1 = IN
 ; ^XMB(3.7,DUZ,2,basket,1,XMZ,0) = DateReceived
 W !,"=== Manual Basket Insert ===",!
 N XMZ S XMZ=3265
 ; Place into IN basket (1) for DUZ 87
 ; The subfile structure: ^XMB(3.7,DUZ,2,basket,1,messageIEN,0)=date
 S ^XMB(3.7,DUZ,2,1,1,XMZ,0)=$P($G(^XMB(3.9,XMZ,0)),U,3)
 ; Update the basket header
 N CNT S CNT=0,XMZ=""
 F  S XMZ=$O(^XMB(3.7,DUZ,2,1,1,XMZ)) Q:XMZ=""  S CNT=CNT+1
 S $P(^XMB(3.7,DUZ,2,1,0),U,3)=CNT
 S $P(^XMB(3.7,DUZ,2,1,0),U,4)=CNT
 W "Inserted. Count now: "_CNT,!
 ;
 ; Also insert msg 3264
 S XMZ=3264
 I '$D(^XMB(3.7,DUZ,2,1,1,3264)) D
 . S ^XMB(3.7,DUZ,2,1,1,3264,0)=$P($G(^XMB(3.9,3264,0)),U,3)
 . W "Also inserted 3264",!
 ;
 ; Recount
 S CNT=0,XMZ=""
 F  S XMZ=$O(^XMB(3.7,DUZ,2,1,1,XMZ)) Q:XMZ=""  S CNT=CNT+1
 S $P(^XMB(3.7,DUZ,2,1,0),U,3)=CNT
 S $P(^XMB(3.7,DUZ,2,1,0),U,4)=CNT
 W "Final count: "_CNT,!
 ;
 ; Verify counts via API
 W "BMSGCT(1): "_$$BMSGCT^XMXUTIL(DUZ,1),!
 W "TMSGCT: "_$$TMSGCT^XMXUTIL(DUZ),!
 ;
 ; Read back from basket
 W !,"=== IN Basket Messages ===",!
 S XMZ=""
 F  S XMZ=$O(^XMB(3.7,DUZ,2,1,1,XMZ)) Q:XMZ=""  D
 . N HDR S HDR=$G(^XMB(3.9,XMZ,0))
 . W "  MSG "_XMZ_": subj="_$P(HDR,U,1)_" from="_$P(HDR,U,2)_" date="_$P(HDR,U,3),!
 ;
 W !,"DONE",!
 Q
