function [target,limit]=speed_target(tr,s,v,authority,nextStop,net,c)
% Anticipatory speed envelope. Local caps are explicit MODEL assumptions.
% Ideal route position/speed feedback; not an implementation of LZB/ETCS.
[~,~,j]=network.locate(tr,s,net);
caps=net.edges.ModelCap_kmh(tr.edges)/3.6;
limit=min([c.cruise,c.trainMax,caps(j)]); target=limit;
for k=j+1:numel(tr.edges)
    distance=tr.offsets(k)-s;
    target=min(target,sqrt(max(0,caps(k)^2+2*c.serviceBrake* ...
        (distance-v*(c.response+c.dt)))));
end
% Optional, explicitly configured terminal approach; zero disables it.
if c.terminalApproach>0
    if s<c.terminalApproach || tr.length-s<c.terminalApproach
        limit=min(limit,c.terminalSpeed); target=min(target,limit);
    end
    distance=tr.length-c.terminalApproach-s;
    if distance>0, target=min(target,sqrt(max(0,c.terminalSpeed^2+2*c.serviceBrake*(distance-v*(c.response+c.dt))))); end
end
available=max(0,authority-s-c.reserve-v*(c.response+c.dt));
target=min(target,sqrt(2*c.serviceBrake*available));
distance=max(0,nextStop-s-v*c.dt);
target=min(target,sqrt(2*c.serviceBrake*distance));
end
