function [e,x,j]=locate(tr,s,net)
% Canonical edge coordinate, independent of each route leg's direction.
s=min(tr.length,max(0,s));
j=find(s<tr.offsets(2:end),1);
if isempty(j), j=numel(tr.edges); end
e=tr.edges(j); x=s-tr.offsets(j);
if network.edge_direction(tr,j)<0, x=net.edges.Length_km(e)*1000-x; end
end
