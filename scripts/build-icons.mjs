// Генерирует PNG без зависимостей, чтобы Android PWA устанавливалась с узнаваемой иконкой.
import { mkdirSync,writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";
const crcTable = new Uint32Array(256);
for(let i=0;i<256;i++){let c=i;for(let j=0;j<8;j++)c=c&1?0xedb88320^(c>>>1):c>>>1;crcTable[i]=c>>>0;}
function crc(buffer){let c=0xffffffff;for(const b of buffer)c=crcTable[(c^b)&255]^(c>>>8);return (c^0xffffffff)>>>0;}
function chunk(type,bytes){const name=Buffer.from(type),length=Buffer.alloc(4);length.writeUInt32BE(bytes.length);const tail=Buffer.alloc(4);tail.writeUInt32BE(crc(Buffer.concat([name,bytes])));return Buffer.concat([length,name,bytes,tail]);}
function draw(size){
  const p=Buffer.alloc(size*size*4);
  const rect=(nx,ny,nw,nh,color,radius=0)=>{
    const [r,g,b]=color;const x0=Math.round(nx*size),y0=Math.round(ny*size),x1=Math.round((nx+nw)*size),y1=Math.round((ny+nh)*size),rad=radius*size;
    for(let y=Math.max(0,y0);y<Math.min(size,y1);y++)for(let x=Math.max(0,x0);x<Math.min(size,x1);x++){
      const dx=Math.max(x0+rad-x,0,x-(x1-rad)),dy=Math.max(y0+rad-y,0,y-(y1-rad));
      if(dx*dx+dy*dy>rad*rad)continue;
      const i=(y*size+x)*4;p[i]=r;p[i+1]=g;p[i+2]=b;p[i+3]=255;
    }
  };
  rect(0,0,1,1,[246,248,252]);
  rect(.055,.055,.89,.89,[85,103,222],.19);
  // Силуэт открытого блокнота — узнаваем и на экране телефона.
  rect(.235,.20,.53,.60,[255,255,255],.07);
  rect(.305,.29,.09,.09,[85,103,222],.016);
  rect(.44,.315,.23,.035,[85,103,222],.006);
  rect(.305,.43,.09,.09,[85,103,222],.016);
  rect(.44,.455,.23,.035,[85,103,222],.006);
  rect(.305,.57,.09,.09,[85,103,222],.016);
  rect(.44,.595,.23,.035,[85,103,222],.006);
  // Галочка выполненного задания.
  rect(.32,.594,.03,.045,[50,163,121],.003);
  // Палитра из четырёх цветов уменьшает размер файла для передачи с телефона.
  const colors=[[246,248,252],[85,103,222],[255,255,255],[50,163,121]];
  const lookup=new Map(colors.map((c,i)=>[c.join(","),i]));
  const raw=Buffer.alloc((size+1)*size);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const i=(y*size+x)*4;
    const index=lookup.get([p[i],p[i+1],p[i+2]].join(","));
    if(index===undefined)throw Error("Unknown icon color");
    raw[y*(size+1)+1+x]=index;
  }
  const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(size,0);ihdr.writeUInt32BE(size,4);ihdr[8]=8;ihdr[9]=3;
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk("IHDR",ihdr),chunk("PLTE",Buffer.from(colors.flat())),chunk("IDAT",deflateSync(raw,{level:9})),chunk("IEND",Buffer.alloc(0))]);
}
mkdirSync("icons",{recursive:true});
for(const size of [192,512])writeFileSync("icons/icon-"+size+".png",draw(size));
console.log("Icons generated: 192, 512 PNG");
