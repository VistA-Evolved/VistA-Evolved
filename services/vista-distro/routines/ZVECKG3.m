ZVECKG3 ;VE/KM - Test LIST^ZVERPC
 ;
 N R
 D LIST^ZVERPC(.R,"")
 W "Count: ",R(0),!
 I R(0)>0 D
 . W "First: ",R(1),!
 . W "Last: ",R(R(0)),!
 Q
