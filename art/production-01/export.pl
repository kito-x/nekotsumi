use strict; use warnings; use JSON::PP;
use FindBin qw($Bin);
my $root=$Bin;
sub save { my($path,$data)=@_;open my $f,'>',"$root/$path" or die $!;print $f $data;close $f; }
sub svg {my($w,$h,$inside)=@_;return qq{<svg xmlns="http://www.w3.org/2000/svg" width="$w" height="$h" viewBox="0 0 $w $h">$inside</svg>};}
my %coats=(default=>['#fff3d2','#edb39d'],ginger=>['#f5b774','#d98345'],tuxedo=>['#69656b','#fff3d2'],calico=>['#fff3d2','#dc9556']);
my @bodies; my @faces;
for my $id(qw(default ginger tuxedo calico)){
 my($fill,$accent)=@{$coats{$id}};
 my $mark=$id eq 'ginger'?qq{<path d="M234 85l-6 35m53-37-3 32m48-22-5 33M394 174l-28 8m32 31-28 2" stroke="$accent" stroke-width="16" stroke-linecap="round"/>}:$id eq 'calico'?qq{<path d="M80 114Q110 72 177 82Q194 144 157 155Q117 159 80 114M337 85Q417 91 443 161Q386 168 350 130Z" fill="$accent"/>}:$id eq 'tuxedo'?'<path d="M178 113Q210 149 256 161Q300 146 331 113Q347 245 398 325Q320 347 255 347Q173 347 113 324Q169 233 178 113Z" fill="#fff3d2"/>':'';
 my $shape=qq{<defs><clipPath id="body"><path d="M48 211Q48 109 141 87Q220 70 360 86Q464 99 464 210L464 276Q464 348.387 393 348.387H117Q48 348.387 48 277Z"/></clipPath></defs><g stroke="#51382f" stroke-width="8" stroke-linejoin="round"><path d="M389 130Q457 131 452 74Q448 48 432 54Q415 62 425 83Q431 106 389 102" fill="$fill"/><path d="M83 136L80 42Q82 32 94 42L161 93M335 95L390 43Q401 36 403 50L415 148" fill="$fill"/><path d="M97 66l7 48 32-19M381 68l-29 29 39 17" fill="#efb4a6" stroke="none"/><path d="M48 211Q48 109 141 87Q220 70 360 86Q464 99 464 210L464 276Q464 348.387 393 348.387H117Q48 348.387 48 277Z" fill="$fill"/><g clip-path="url(#body)" stroke="none">$mark</g><path d="M80 295Q81 330 113 330H142Q168 327 159 302M351 303Q342 328 370 330H398Q429 328 430 299" fill="$fill"/></g>};
 save("bodies/$id.svg",svg(512,384,$shape));
 push @bodies,{id=>$id,url=>"bodies/$id.svg",sourceSize=>[512,384],logicalRectPx=>[48,80,416,416/1.55],pivotPx=>[256,80+416/1.55],faceAnchorBodyUV=>[0.5,0.48],decorativeBoundsPx=>[44,32,468,353],provenance=>'Native vector adaptation of user-selected Gemini concept cats-A.png; AI-assisted native paths authored by Studio',approvalReference=>'106a82ae-ebb8-471b-8068-b89cc25b475e:sunroom (direction only; runtime exports pending review)'};
}
my %expressions=(
 idle=>'<path d="M28 51q10 10 20 0M80 51q10 10 20 0"/>',
 focused=>'<path d="M26 45h24M78 45h24"/><path d="M39 47v13M89 47v13" stroke-width="8"/>',
 happy=>'<path d="M27 54q11-18 22 0M79 54q11-18 22 0"/>',
 surprised=>'<ellipse cx="38" cy="52" rx="11" ry="15"/><ellipse cx="90" cy="52" rx="11" ry="15"/>',
 worried=>'<path d="M26 34l20-8M82 26l20 8"/><path d="M38 48v10M90 48v10" stroke-width="8"/>',
 dizzy=>'<path d="M39 53q-1-7-7-3q-6 7 3 12q13 4 16-10q0-16-16-16q-21 2-20 24M91 53q-1-7-7-3q-6 7 3 12q13 4 16-10q0-16-16-16q-21 2-20 24"/>'
);
for my $id(qw(idle focused happy surprised worried dizzy)){
 my $mouth=$id eq 'surprised'?'<ellipse cx="64" cy="85" rx="6" ry="9" fill="#51382f"/>':$id eq 'worried'?'<path d="M55 88q9-9 18 0"/>':$id eq 'happy'?'<path d="M53 78q11 27 22 0Z" fill="#df8d8b"/>':'<path d="M51 80q5 9 13 0q8 9 13 0"/>';
 my $inside=qq{<g fill="none" stroke="#51382f" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">$expressions{$id}<path d="M59 70q5-4 10 0l-5 5Z" fill="#df8d8b" stroke-width="3"/>$mouth</g>};
 save("faces/$id.svg",svg(128,128,$inside));
 push @faces,{id=>$id,url=>"faces/$id.svg",sourceSize=>[128,128],anchorPx=>[64,64],renderWidthBodyFraction=>0.45};
}
save('background-main.svg',svg(576,1024,'<defs><linearGradient id="warm" x2="0" y2="1"><stop stop-color="#f9dfbf"/><stop offset="1" stop-color="#fff6df"/></linearGradient></defs><path fill="url(#warm)" d="M0 0h576v1024H0z"/><path fill="#f2d5b0" d="M0 0h12v1024H0zM564 0h12v1024h-12z"/><path fill="#fff6df" opacity=".55" d="M0 60Q180 180 12 650H0zM576 300Q400 420 564 860h12z"/>'));
save('floor.svg',svg(512,48,'<rect x="4" y="4" width="504" height="40" rx="18" fill="#e7b780" stroke="#51382f" stroke-width="6"/><path d="M24 15h464" stroke="#fff1d3" stroke-width="5" stroke-linecap="round"/>'));
save('guide-shadow.svg',svg(128,32,'<ellipse cx="64" cy="16" rx="58" ry="10" fill="#51382f" opacity=".18"/>'));
save('effects/star.svg',svg(64,64,'<path d="M32 4l8 18 20 10-20 8-8 20-8-20L4 32l20-10Z" fill="#f5d487" stroke="#886343" stroke-width="3"/>'));
save('effects/puff.svg',svg(64,64,'<path d="M10 48Q0 32 16 26Q14 10 30 14Q42 3 50 22Q67 27 56 43Q57 56 41 53H20Q10 58 10 48" fill="#fff3dc" opacity=".85"/>'));
my %icons=(pause=>'<path d="M10 7v18M22 7v18"/>',sound=>'<path d="M5 13h5l7-6v18l-7-6H5Z M23 11q7 5 0 10"/>',lock=>'<rect x="7" y="14" width="18" height="14" rx="3"/><path d="M11 14V9a5 5 0 0110 0v5"/>',selected=>'<path d="M6 17l7 7L27 8"/>',warning=>'<path d="M16 4L2 28h28Z M16 13v6M16 24v1"/>',mode=>'<path d="M5 16h22M10 10l-6 6 6 6M22 10l6 6-6 6"/>');
for my $id(keys %icons){save("icons/$id.svg",svg(32,32,qq{<g fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">$icons{$id}</g>}));}
my @files;for my $path(map($_->{url},@bodies,@faces),'background-main.svg','floor.svg','guide-shadow.svg','effects/star.svg','effects/puff.svg',map("icons/$_.svg",sort keys %icons)){push @files,{url=>$path,bytes=>-s "$root/$path"};}
my $manifest={manifestVersion=>1,artStatus=>'direction-approved-runtime-review-required',provider=>'Gemini through OpenRouter for concept source; native SVG adaptations for runtime',bodies=>\@bodies,faces=>\@faces,background=>{url=>'background-main.svg',sourceSize=>[576,1024]},floor=>{url=>'floor.svg',topPx=>4},files=>\@files,sounds=>[],renderNotes=>'Draw faces at bodyUV anchor using center anchorPx; face width 0.45 logical body width. Prefix SVG internal IDs when inlining several bodies. No physics geometry from alpha; no production integration approval yet.'};
$manifest->{artStatus}='provisional-selection-reopened';
$manifest->{selectionNote}='User requested new actual Gemini and Grok comparison through OG message d348ea36-a933-4e10-9f2e-d66a1302fe86. Prior approval retained as history; no final art lock pending comparison.';
$manifest->{approvalReference}='4594228a-c9b8-47e0-91e7-dfe9d4dd6c06:approve';
$manifest->{renderNotes}='Draw faces at bodyUV anchor using center anchorPx; face width 0.45 logical body width. Prefix SVG internal IDs when inlining several bodies. No physics geometry from alpha. User approved native SVG production pass, including faces; gameplay integration still requires runtime validation.';
$_->{approvalReference}=$manifest->{approvalReference} for @bodies;
save('manifest.json',JSON::PP->new->canonical->pretty->encode($manifest));
my $total=0;$total+=$_->{bytes} for @files;print encode_json({runtimeFiles=>scalar @files,totalBytes=>$total,status=>$manifest->{artStatus}}),"\n";
