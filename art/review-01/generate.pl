use strict;
use warnings;
use JSON::PP;
use MIME::Base64 qw(decode_base64);
use IPC::Open2;
use FindBin qw($Bin);
my $dir = $Bin;
my %briefs = (
 'cats-A' => ['1:1', 'Use case: stylized-concept. Create a beautiful coherent character design review sheet for Cat Tower, a cute mobile cat-stacking game. Six expressive original sleepy loaf cats in a precise 3-column 2-row grid on solid pale cream, each fully separate with generous margins. Flat 2D sticker illustration, thick dark cocoa clean outlines, pastel peach sage lavender palette, restrained simple shading, crisp readable at tiny size. Every cat is a broad rounded horizontal loaf, tiny ears on top, paws tucked beneath, short tail hugging body, front-facing facial features, broad nearly level underside for stacking; no accessories extending outside silhouette. Top row: cream cat with sleepy closed eyes and tiny pink nose; ginger striped cat with smug half-open eyes; charcoal cat with surprised round eyes. Bottom row: white-and-ginger calico with one nervous brow; lavender-grey cat with delighted closed-eye smile; mint-tinted white cat with dizzy spiral eyes. Consistent body proportions and line weight. No text, no lettering, no border, no UI, no objects, no background scene. These are provisional character concepts, not a sprite animation sheet.'],
 'background-A-sunroom' => ['9:16', 'Use case: stylized-concept. Asset type: portrait 2D background option A for cute mobile cat-stacking game Cat Tower. Cozy pastel sunroom, warm buttercream wall, peach dawn light, small sage plants only at extreme lower side edges, a tall softly outlined arched window in upper corner, very pale distant clouds. Polished flat illustration with soft paper warmth, dark cocoa gentle outlines only on peripheral props. A simple horizontal honey-wood base platform at 88 percent image height across the image. Preserve a completely empty very low-contrast cream central play corridor from x=20 percent to x=80 percent and from y=12 percent to y=86 percent; no furniture, lines, hanging objects, foreground objects or decorations in that lane. Empty top strip for later interface. No cats, no characters, no text, no buttons, no score, no watermark. Straight-on orthographic camera. Gentle cozy mood, compatible with rounded pastel loaf-cat stickers. Full bleed finished illustration.'],
 'background-B-moonroom' => ['9:16', 'Use case: stylized-concept. Asset type: portrait 2D background option B for cute mobile cat-stacking game Cat Tower. Quiet dreamy moonlit attic in powder lavender and muted blue, cream crescent moon and a few tiny stars only at upper outside edges, softly suggested rounded window in far upper corner, one tiny muted plant at lower side edge. Polished flat illustration, soft paper warmth, restrained dark cocoa outlines only on peripheral props, friendly cozy bedtime mood rather than dark night. A simple horizontal pale honey-wood base platform at 88 percent image height across image. Preserve a completely empty very low-contrast pale lavender central play corridor from x=20 percent to x=80 percent and y=12 percent to y=86 percent; no furniture, architectural lines or decorations in lane. Empty top strip for later interface. No cats, no characters, no text, no UI, no score, no watermark. Straight-on orthographic camera. Same rounded pastel illustration family as cozy loaf-cat sticker art. Full bleed finished illustration.'],
);
my $name = shift @ARGV or die 'asset name required';
die 'unknown asset' unless $briefs{$name};
my ($ratio,$prompt)=@{$briefs{$name}};
my $payload={model=>'google/gemini-2.5-flash-image',prompt=>$prompt,aspect_ratio=>$ratio,n=>1};
open my $p,'>',"$dir/$name.request.json" or die $!; print $p JSON::PP->new->pretty->encode($payload); close $p;
my $key = $ENV{OPENROUTER_API_KEY} or die 'OPENROUTER_API_KEY is required';
my $pid=open2(my $out,my $in,'curl','-sS','--max-time','180','--config','-','--header','Content-Type: application/json','--data-binary',"\@$dir/$name.request.json",'https://openrouter.ai/api/v1/images');
print $in "header = \"Authorization: Bearer $key\"\n"; close $in;
my $raw=do{local $/;<$out>}; close $out; waitpid($pid,0);
my $data=eval{decode_json($raw)}; die 'Non-JSON provider response' unless $data;
if($data->{error}){print encode_json({asset=>$name,error=>$data->{error}}),"\n";exit 1;}
my $image=$data->{data}[0]; die 'No image returned' unless $image->{b64_json};
my $bytes=decode_base64($image->{b64_json});
die 'Expected PNG output' unless substr($bytes,0,8) eq "\x89PNG\r\n\x1a\n";
open my $im,'>:raw',"$dir/$name.png" or die $!;print $im $bytes;close $im;
delete $_->{b64_json} for @{$data->{data}};
my ($w,$h)=unpack('NN',substr($bytes,16,8));
$data->{verification}={width=>$w,height=>$h,bytes=>length($bytes),provider=>'OpenRouter',model=>$payload->{model},status=>'provisional'};
open my $m,'>',"$dir/$name.receipt.json" or die $!; print $m JSON::PP->new->pretty->encode($data);close $m;
print encode_json({asset=>$name,%{$data->{verification}},usage=>$data->{usage}}),"\n";
