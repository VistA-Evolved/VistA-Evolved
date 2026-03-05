ZVETST	;VistA-Evolved/test -- Test ZVEADT WARDS call
	;
	N RES
	D WARDS^ZVEADT(.RES,"")
	W "RESULT(0)=",$G(RES(0)),!
	W "Count=",$O(RES(""),-1),!
	N I S I=0
	F  S I=$O(RES(I)) Q:'I  W "  RES(",I,")=",RES(I),!
	W "=== DONE ===",!
	Q
