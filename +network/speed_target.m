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
% A synthetic 80 km/h terminal approach is used for the last/first 3 km.
if s<3000 || tr.length-s<3000, limit=min(limit,80/3.6); target=min(target,limit); end
distance=tr.length-3000-s;
if distance>0, target=min(target,sqrt(max(0,(80/3.6)^2+2*c.serviceBrake*(distance-v*(c.response+c.dt))))); end
available=max(0,authority-s-c.reserve-v*(c.response+c.dt));
target=min(target,sqrt(2*c.serviceBrake*available));
distance=max(0,nextStop-s-v*c.dt);
target=min(target,sqrt(2*c.serviceBrake*distance));
end
