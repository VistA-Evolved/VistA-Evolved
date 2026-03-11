ZVECHK9 ;VistA-Evolved -- Direct auth simulation ;2026
 ;
CHECK ;
 N U S U="^"
 ; First call CHECKAV^XUS directly with plain text
 K DUZ S DUZ=0,XUF=0,XUNOW=$$NOW^XLFDT(),DT=$P(XUNOW,".")
 S IO=$I,IO(0)=IO
 W "=== Direct CHECKAV^XUS ===",!
 S DUZ=$$CHECKAV^XUS("PRO1234;PRO1234!!")
 W "DUZ after CHECKAV: ",DUZ,!
 I DUZ>0 D
 . ; Now call USER^XUS to populate XUSER
 . D USER^XUS(DUZ)
 . W "XUSER(0): ",$G(XUSER(0)),!
 . W "XUSER(1): ",$G(XUSER(1)),!
 . W "XUSER(1.1): ",$G(XUSER(1.1)),!
 . ; Now call UVALID
 . N XUMSG S XUMSG=$$UVALID^XUS()
 . W "UVALID result: ",XUMSG,!
 . I XUMSG W "UVALID text: ",$$TXT^XUS3(XUMSG),!
 . I 'XUMSG D
 . . ; Try POST
 . . N RET S RET(5)=0
 . . N POSTMSG S POSTMSG=$$POST^XUSRB(1)
 . . W "POST result: ",POSTMSG,!
 . . I POSTMSG W "POST text: ",$$TXT^XUS3(POSTMSG),!
 E  D
 . W "Authentication FAILED at CHECKAV",!
 . ; Check what error text
 . N I F I=1:1:25 D
 . . N TXT S TXT=$$TXT^XUS3(I)
 . . I TXT'="" W "Code ",I,": ",TXT,!
 Q
