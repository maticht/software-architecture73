import fs from "node:fs";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const noVideo = `<style>video,iframe[src*="youtube"],iframe[src*="vimeo"],[class*="video-player"],[class*="video-placeholder"]{display:none!important}</style>`;

const gallery = `<style>#course-lightbox{position:fixed;inset:0;background:rgba(10,11,16,.96);z-index:2147483647;display:none;align-items:center;justify-content:center;padding:60px 82px}#course-lightbox.on{display:flex}#course-lightbox img{max-width:100%;max-height:calc(100vh - 120px);object-fit:contain;box-shadow:0 20px 70px #000}#course-lightbox button{position:fixed;color:#17171b;background:#fff;border:0;border-radius:50%;width:48px;height:48px;font:32px Arial;line-height:1;cursor:pointer}#course-close{right:24px;top:22px}#course-prev{left:24px;top:calc(50% - 24px)}#course-next{right:24px;top:calc(50% - 24px)}#course-gallery-count{position:fixed;bottom:24px;color:#fff;font:14px Arial;letter-spacing:.08em}body.course-no-scroll{overflow:hidden!important}</style><div id="course-lightbox"><img alt=""><button id="course-close" aria-label="close">&times;</button><button id="course-prev" aria-label="previous">&#8249;</button><button id="course-next" aria-label="next">&#8250;</button><span id="course-gallery-count"></span></div><script>(function(){var i=0,box=document.getElementById('course-lightbox'),out=box.querySelector('img'),count=document.getElementById('course-gallery-count');function images(){return [].slice.call(document.querySelectorAll('img')).filter(function(img){return img!==out&&(img.currentSrc||img.src)})}function show(n,list){list=list||images();if(!list.length)return;i=(n+list.length)%list.length;out.src=list[i].currentSrc||list[i].src;count.textContent=(i+1)+' / '+list.length;box.classList.add('on');document.body.classList.add('course-no-scroll')}function close(){box.classList.remove('on');document.body.classList.remove('course-no-scroll')}document.addEventListener('click',function(e){var target=e.target;var img=target&&target.closest&&target.closest('img');if(!img||box.contains(img))return;var list=images(),index=list.indexOf(img);if(index>-1){e.preventDefault();e.stopPropagation();show(index,list)}},true);document.getElementById('course-close').onclick=close;document.getElementById('course-prev').onclick=function(){show(i-1)};document.getElementById('course-next').onclick=function(){show(i+1)};box.onclick=function(e){if(e.target===box)close()};document.addEventListener('keydown',function(e){if(!box.classList.contains('on'))return;if(e.key==='Escape')close();if(e.key==='ArrowLeft')show(i-1);if(e.key==='ArrowRight')show(i+1)})})();</script>`;

export function GET(request: NextRequest) {
  const file = request.nextUrl.searchParams.get("file");
  if (!file || file.includes("..") || !/\.(html|pdf)$/i.test(file)) return new NextResponse("Not found", { status: 404 });
  const root = path.resolve(process.cwd(), "..");
  const absolute = path.resolve(root, file);
  if (!absolute.startsWith(root) || !fs.existsSync(absolute)) return new NextResponse("Not found", { status: 404 });
  if (absolute.toLowerCase().endsWith(".pdf")) return new NextResponse(fs.readFileSync(absolute), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(path.basename(absolute))}` } });
  const html = fs.readFileSync(absolute, "utf8").replace(/<\/body>/i, `${noVideo}${gallery}</body>`);
  return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Content-Disposition": "inline" } });
}
