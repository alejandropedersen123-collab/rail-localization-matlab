function distance=stopping_distance(c,sc,v)
% Evaluation envelope under exactly the simulated plant assumptions.
peak=min(sc.brake,sc.mu*c.g); grade=c.g*sc.downhill;
if peak<=grade, distance=Inf; return; end
T=c.buildTime; vt=v+grade*T-.5*peak*T;
if vt<=0
    rr=roots([-.5*peak/T grade v]); T=min(real(rr(abs(imag(rr))<1e-9 & real(rr)>=0)));
    distance=v*c.response+v*T+.5*grade*T^2-peak*T^3/(6*c.buildTime);
else
    distance=v*c.response+v*T+.5*grade*T^2-peak*T^2/6+vt^2/(2*(peak-grade));
end
end
