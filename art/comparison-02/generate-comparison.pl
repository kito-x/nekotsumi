use strict;use warnings;use JSON::PP;use MIME::Base64 qw(decode_base64);use IPC::Open2;
use FindBin qw($Bin);use Digest::SHA qw(sha256_hex);
my $dir = $Bin;
my($provider,$asset)=@ARGV;die 'provider gemini|grok; asset cats|sunroom' unless $provider && $asset && $provider=~/^(gemini|grok)$/ && $asset=~/^(cats|sunroom)$/;
my %briefs=(
cats=>'Create an original character design option sheet for Cat Tower, a cute mobile browser cat-stacking game. Exactly four cats in a spacious two-column two-row grid on uniform pale cream background, each completely separate and fully visible. Top-left sleepy cream cat with closed eyes, top-right smug ginger tabby with half-open eyes, bottom-left startled charcoal tuxedo with cream muzzle and chest, bottom-right happy smiling white-and-ginger calico. Warm friendly 2D flat storybook sticker illustration, bold clean dark cocoa outlines, pastel peach and sage accents, simple subtle warm shading, crisp at small mobile size. All four use the SAME broad horizontal rounded loaf silhouette, logical body width-to-height ratio 1.55:1, broad nearly flat top and flat base suitable for stacking, tiny triangular ears above, two tiny tucked paws, very short tail curled along the body INSIDE the silhouette. Each face centered in the front of body, readable tiny eyes and nose. NO upright tails, NO oval platforms, NO oval bases, NO ground shadow, NO circles behind cats, NO props, NO hats, NO floor, NO text, NO labels, NO watermarks, NO interface, NO additional cats. Keep consistent proportions, outline weight and lighting across all four. These are review concepts, not final transparent runtime sprites.',
sunroom=>'Create an original portrait 2D background option for Cat Tower, a cute mobile browser cat-stacking game. Cozy sunroom at dawn, warm buttercream and pale peach wall washed in soft golden light. Muted sage botanical hints at the extreme lower outside edges and the faint suggestion of a rounded window only at the upper outside edge. Rounded friendly storybook illustration, soft paper warmth, restrained flat shading, coordinated with pastel loaf cats outlined in dark cocoa. Straight-on orthographic view, not a perspective room. Approximately 95 percent of the playfield width must remain visually quiet and low contrast for a tower of moving cats. Entire central field is a soft uncluttered cream wash; no hard architectural lines or window frames across it. Keep top area quiet for later HTML controls. NO cats, characters, floor, platform, shelves, furniture, obstacles, shadows of cats, UI, score, text, logos or watermark. Platform will be a separately drawn runtime asset. Full bleed portrait illustration. This is a background concept source for review, not a final cropped runtime export.'
);
my $name="$provider-$asset";my $isx=$provider eq 'grok';
my $model=$isx?'grok-imagine-image-2.0':'google/gemini-2.5-flash-image';
my $endpoint=$isx?'https://api.x.ai/v1/images/generations':'https://openrouter.ai/api/v1/images';
my $payload={model=>$model,prompt=>$briefs{$asset},aspect_ratio=>($asset eq 'cats'?'1:1':'9:16'),n=>1};
if($isx){$payload->{quality}='low';$payload->{resolution}='1k';$payload->{response_format}='b64_json';}
sub writejson{my($p,$v)=@_;open my $f,'>',"$dir/$p" or die $!;print $f JSON::PP->new->canonical->pretty->encode($v);close $f;}
writejson("$name.request.json",$payload);
my $key_name = $isx ? 'XAI_API_KEY' : 'OPENROUTER_API_KEY';
my $key = $ENV{$key_name} or die "$key_name is required";
my $started=time;my $pid=open2(my $out,my $in,'curl','-sS','--max-time','180','--config','-','--header','Content-Type: application/json','--data-binary',"\@$dir/$name.request.json",$endpoint);
print $in "header = \"Authorization: Bearer $key\"\n";close $in;my $raw=do{local $/;<$out>};close $out;waitpid($pid,0);my $exit=$?;
my $data=eval{decode_json($raw)};die "Invalid JSON or transport failure ($exit)" unless $data;
if($data->{error}){writejson("$name.error.json",$data);print encode_json({asset=>$name,error=>$data->{error}}),"\n";exit 1;}
my $b64=$data->{data}[0]{b64_json};die 'No image returned; do not automatically regenerate paid request' unless $b64;my $bytes=decode_base64($b64);my($ext,$w,$h);
if(substr($bytes,0,8) eq "\x89PNG\r\n\x1a\n"){$ext='png';($w,$h)=unpack('NN',substr($bytes,16,8));}
elsif(substr($bytes,0,2) eq "\xff\xd8"){$ext='jpg';my $p=2;while($p<length($bytes)-9){$p++ while ord(substr($bytes,$p,1))!=255 && $p<length($bytes)-9;$p++ while ord(substr($bytes,$p,1))==255;my $marker=ord(substr($bytes,$p++,1));last if $marker==0xda||$marker==0xd9;next if $marker==1||($marker>=0xd0&&$marker<=0xd7);my $len=unpack('n',substr($bytes,$p,2));if(($marker>=0xc0&&$marker<=0xc3)||($marker>=0xc5&&$marker<=0xc7)||($marker>=0xc9&&$marker<=0xcb)||($marker>=0xcd&&$marker<=0xcf)){($h,$w)=unpack('nn',substr($bytes,$p+3,4));last;}$p+=$len;}die 'JPEG dimensions not found' unless $w&&$h;}
else{die 'Unexpected image media format';}
open my $im,'>:raw',"$dir/$name.$ext" or die $!;print $im $bytes;close $im;
delete $_->{b64_json} for @{$data->{data}};
$data->{verification}={provider=>($isx?'xAI direct API':'Google Gemini via OpenRouter'),model=>$model,endpoint=>$endpoint,sourceRequest=>"$name.request.json",output=>"$name.$ext",width=>$w,height=>$h,bytes=>length($bytes),sha256=>sha256_hex($bytes),startedUnix=>$started,completedUnix=>time,status=>'provisional-comparison-only',samePromptAs=>($isx?'gemini':'grok')."-$asset.request.json"};
if($isx){$data->{costEvidence}={publishedEstimateUSD=>0.04,basis=>'1 returned image; grok-imagine-image-2.0,1k,low, $0.04 per output image',source=>'https://docs.x.ai/developers/pricing',note=>'Published estimate only unless API usage explicitly reports actual cost. Account billing not queried.'};}
writejson("$name.receipt.json",$data);print encode_json({%{$data->{verification}},usage=>$data->{usage},costEvidence=>$data->{costEvidence}}),"\n";
