function [s,v]=advance(s,v,a,h)
% Constant-acceleration integration; analytically stop without reverse motion.
if a<0 && v+a*h<0
    stoppingTime=-v/a; s=s+v*stoppingTime+.5*a*stoppingTime^2; v=0;
else
    s=s+v*h+.5*a*h*h; v=max(0,v+a*h);
end
end
