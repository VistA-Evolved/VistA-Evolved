ZVECHK4 ; Check XWB broker dispatch code
 Q
EN ;
 ; Dump relevant XWB code to understand how RPCs are dispatched
 ; Look at XWBBRK2 or XWBEXEC
 W "=== Checking XWB dispatch routines ===",!
 ;
 ; Show XWBBRK2 execution tag
 N I,LINE
 W "--- XWBBRK2 (first 60 lines) ---",!
 F I=0:1:60 S LINE=$T(+I^XWBBRK2) Q:LINE=""  W LINE,!
 ;
 W !,"--- Looking for ARRAY/result handling ---",!
 ; Search for key tags in XWBBRK
 F I=0:1:200 S LINE=$T(+I^XWBBRK) Q:LINE=""  D
 . I LINE["ARRAY"!(LINE["RESULT")!(LINE["RES")!(LINE[".04") W I_": "_LINE,!
 Q
