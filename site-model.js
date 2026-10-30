const SitePractice = {
 create(minutes){return {remainingMs:minutes*60000,deadline:null,status:'idle'};},
 remaining(session,now=Date.now()){return Math.max(0,session.deadline===null?session.remainingMs:session.deadline-now);},
 start(session,now=Date.now()){const remaining=this.remaining(session,now);return {...session,remainingMs:remaining,deadline:now+remaining,status:remaining?'running':'finished'};},
 pause(session,now=Date.now()){const remaining=this.remaining(session,now);return {...session,remainingMs:remaining,deadline:null,status:remaining?'paused':'finished'};},
 format(ms){const seconds=Math.ceil(ms/1000);return `${String(Math.floor(seconds/3600)).padStart(2,'0')}:${String(Math.floor(seconds/60)%60).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;}
};
if(typeof module!=='undefined')module.exports=SitePractice;
