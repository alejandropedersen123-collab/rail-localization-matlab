function p=plant_step(p,t,h,command,c,sc)
% Idealized closed-loop longitudinal dynamics, exact integration per phase.
% Cruise/reaction holds speed; brake force then builds linearly.
initialV=p.v; remaining=h; now=t;
peak=min(sc.brake,sc.mu*c.g); grade=c.g*sc.downhill;
while remaining>1e-10 && p.v>0
    start=command+c.response; finish=start+c.buildTime;
    if now<start
        step=min(remaining,start-now); a=0; jerk=0;
    elseif now<finish
        step=min(remaining,finish-now);
        a=grade-peak*(now-start)/c.buildTime; jerk=-peak/c.buildTime;
    else
        step=remaining; a=grade-peak; jerk=0;
    end
    vEnd=p.v+a*step+.5*jerk*step^2;
    if vEnd<0
        if abs(jerk)<1e-12
            step=-p.v/a;
        else
            rr=roots([.5*jerk a p.v]);
            rr=real(rr(abs(imag(rr))<1e-9 & real(rr)>=0)); step=min(rr);
        end
        p.s=p.s+p.v*step+.5*a*step^2+jerk*step^3/6; p.v=0;
        break;
    end
    p.s=p.s+p.v*step+.5*a*step^2+jerk*step^3/6; p.v=max(0,vEnd);
    remaining=remaining-step; now=now+step;
end
p.a=(p.v-initialV)/h;
end
