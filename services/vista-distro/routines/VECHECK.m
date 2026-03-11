VECHECK ; Phase 21 Docker gate check
CHKRTN ; Check if ZVEMIOP routine exists and responds
 N R D LINKS^ZVEMIOP(.R,5)
 W R(0),!
 Q
CHKRPC ; Check RPC registrations in ^XWB(8994)
 N X S X=""
 F  S X=$O(^XWB(8994,"B",X)) Q:X=""  I X["VE INTEROP" W X,!
 Q
