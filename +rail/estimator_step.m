function [f,d]=estimator_step(f,m,c,ar)
if isempty(f)
    f=struct('x',[0;c.speed;0],'P',diag([16 1 .002]),'lastAccepted',0,'k',0);
end
d=struct('rejected',0,'rejectedGNSS',0,'rejectedRange',0,'rejectedOdo',0);
dt=c.dt; B=[.5*dt^2;dt;0];
if f.k>0
    if ar.fusion && isfinite(m.accel)
        F=[1 dt -.5*dt^2;0 1 -dt;0 0 1];
        f.x=F*f.x+B*m.accel;
        Q=B*B'*c.accelSigma^2+diag([.002 .003 1e-7]);
    else
        F=[1 dt 0;0 1 0;0 0 1]; f.x=F*f.x;
        Q=diag([.1 .03 1e-7]);
    end
    f.P=F*f.P*F'+Q;
end
if ar.fusion && isfinite(m.odo)
    [f,ok]=measurement(f,m.odo,[0 1 0],c.odoSigma^2,ar.controls,c.nisGate);
    if ok, f.lastAccepted=m.t; else, d.rejectedOdo=1; end
end
if isfinite(m.gnss)
    [f,ok]=measurement(f,m.gnss,[1 0 0],c.gnssSigma^2,ar.controls,c.nisGate);
    if ok, f.lastAccepted=m.t; else, d.rejectedGNSS=1; end
end
if ar.fusion
    for j=1:numel(m.ranges)
        if ~isfinite(m.ranges(j)), continue; end
        range=hypot(f.x(1)-c.anchors(j,1),c.anchors(j,2));
        H=[(f.x(1)-c.anchors(j,1))/range 0 0];
        [f,ok]=measurement(f,m.ranges(j)-range+H*f.x,H,c.rangeSigma^2,ar.controls,c.nisGate);
        if ok, f.lastAccepted=m.t; else, d.rejectedRange=d.rejectedRange+1; end
    end
end
d.rejected=d.rejectedGNSS+d.rejectedRange+d.rejectedOdo; f.k=f.k+1;
end

function [f,ok]=measurement(f,y,H,R,controls,gate)
innovation=y-H*f.x; S=H*f.P*H'+R;
ok=~controls || innovation^2/S<gate;
if ~ok, return; end
K=f.P*H'/S; f.x=f.x+K*innovation;
I=eye(3); f.P=(I-K*H)*f.P*(I-K*H)'+K*R*K'; f.P=(f.P+f.P')/2;
end
