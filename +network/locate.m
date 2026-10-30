function [e,x,j]=locate(tr,s,net)
% Edge coordinate in the Madrid-to-branch direction, independent of route.
s=min(tr.length,max(0,s));
j=find(s<tr.offsets(2:end),1);
if isempty(j), j=numel(tr.edges); end
e=tr.edges(j); x=s-tr.offsets(j);
if tr.direction<0, x=net.edges.Length_km(e)*1000-x; end
end
