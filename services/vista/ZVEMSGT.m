ZVEMSGT ; Test ZVEMSGR RPCs ;2026-02-21
 ;
EN ;
 S DUZ=87
 S U="^"
 S DT=$$DT^XLFDT
 N RN S RN=$NA(^TMP("ZVEMT",$J))
 ;
 ; Test FOLDERS
 W "=== Test ZVE MAIL FOLDERS ===",!
 K @RN
 D FOLDERS^ZVEMSGR(RN)
 N I S I=""
 F  S I=$O(@RN@(I)) Q:I=""  W "  ("_I_")="_@RN@(I),!
 ;
 ; Test LIST (basket 1 = IN)
 W !,"=== Test ZVE MAIL LIST (IN basket) ===",!
 K @RN
 N PARAM S PARAM(0)=1
 D LIST^ZVEMSGR(RN,.PARAM)
 S I=""
 F  S I=$O(@RN@(I)) Q:I=""  W "  ("_I_")="_@RN@(I),!
 ;
 ; Test SEND
 W !,"=== Test ZVE MAIL SEND ===",!
 K @RN,PARAM
 S PARAM("SUBJ")="Phase 70 RPC Test Message"
 S PARAM("TEXT",1)="This message was sent via ZVE MAIL SEND RPC."
 S PARAM("TEXT",2)="Second line of the test message."
 S PARAM("REC",1)=87  ; send to self
 D SEND^ZVEMSGR(RN,.PARAM)
 S I=""
 F  S I=$O(@RN@(I)) Q:I=""  W "  ("_I_")="_@RN@(I),!
 ;
 ; Get the message IEN from result
 N XMZ S XMZ=$P($G(@RN@(0)),U,2)
 W "Sent message IEN: "_XMZ,!
 ;
 ; Test LIST again to see new message
 W !,"=== Test ZVE MAIL LIST after send ===",!
 K @RN
 S PARAM(0)=1
 D LIST^ZVEMSGR(RN,.PARAM)
 S I=""
 F  S I=$O(@RN@(I)) Q:I=""  W "  ("_I_")="_@RN@(I),!
 ;
 ; Test GET
 W !,"=== Test ZVE MAIL GET ===",!
 I XMZ>0 D
 . K @RN,PARAM
 . S PARAM(0)=XMZ
 . D GETMSG^ZVEMSGR(RN,.PARAM)
 . S I=""
 . F  S I=$O(@RN@(I)) Q:I=""  W "  ("_I_")="_@RN@(I),!
 ;
 ; Test MANAGE (mark read)
 W !,"=== Test ZVE MAIL MANAGE markread ===",!
 I XMZ>0 D
 . K @RN,PARAM
 . S PARAM("ACTION")="markread"
 . S PARAM("XMZ")=XMZ
 . D MANAGE^ZVEMSGR(RN,.PARAM)
 . S I=""
 . F  S I=$O(@RN@(I)) Q:I=""  W "  ("_I_")="_@RN@(I),!
 ;
 ; Test FOLDERS again to see updated counts
 W !,"=== Test FOLDERS after send ===",!
 K @RN
 D FOLDERS^ZVEMSGR(RN)
 S I=""
 F  S I=$O(@RN@(I)) Q:I=""  W "  ("_I_")="_@RN@(I),!
 ;
 ; Test security: try to read a message not in mailbox
 W !,"=== Test ACCESS DENIED ===",!
 K @RN,PARAM
 S PARAM(0)=248 ; an installation message not in DUZ 87's basket
 D GETMSG^ZVEMSGR(RN,.PARAM)
 S I=""
 F  S I=$O(@RN@(I)) Q:I=""  W "  ("_I_")="_@RN@(I),!
 ;
 W !,"DONE",!
 Q
