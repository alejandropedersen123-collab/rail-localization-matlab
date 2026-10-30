function net=infrastructure(c)
% Reduced topology of lines 010, 030 and 036, not an infrastructure register.
% Distances mix documentary references and approximations, explicitly tagged.
names=["Madrid Atocha";"Ciudad Real";"Puertollano";"Villanueva de Cordoba"; ...
    "Cordoba";"Bif. Malaga AV";"Sevilla Santa Justa";"Puente Genil-Herrera"; ...
    "Antequera Santa Ana";"Malaga Maria Zambrano";"Antequera AV"; ...
    "Bif. Archidona";"Loja";"Granada"];
xy=[480 45;480 135;480 205;480 275;480 345;480 410;180 610; ...
    660 470;660 550;660 710;810 550;920 550;1030 610;1140 710];
net.nodes=table((1:14)',names,xy(:,1),xy(:,2), ...
    'VariableNames',{'ID','Name','X','Y'});
from=[1 2 3 4 5 6 6 8 9 9 11 12 13]';
to=  [2 3 4 5 6 7 8 9 10 11 12 13 14]';
km=[170.750 38.700 76.250 57.970 14.330 112.500 61.664 35.526 ...
    56.851 23.320 9.500 29.390 51.990]';
tracks=[2 2 2 2 2 2 2 2 2 2 2 1 1]';
line=[repmat("010",6,1);repmat("030",3,1);repmat("036",4,1)];
% These are MODEL caps, not a verified current cuadro de velocidades maximas.
caps=[300 300 300 300 220 300 300 300 300 220 300 160 300]';
quality=[repmat("approx_reference",4,1);"documented_segment"; ...
    "derived_approx";repmat("technical_reference_difference",3,1); ...
    repmat("approx_chainage_difference",3,1);"residual_to_documented_total"];
source=["S03";"S03/S04";"S03/S04a";"S04/S04a";"S04";"S01/S04";repmat("S05",3,1); ...
    "S05/S06/S10";"S10";"S06";"S06"];
net.edges=table((1:numel(from))',from,to,km,tracks,line,caps,quality,source, ...
    'VariableNames',{'ID','From','To','Length_km','Tracks','Line', ...
    'ModelCap_kmh','DistanceStatus','Source'});
net.resources=struct('name',{},'type',{}); net.blocks=cell(height(net.edges),1);
net.tokens=zeros(height(net.edges),1);
for e=1:height(net.edges)
    len=km(e)*1000;
    cuts=unique([0,c.stationHalfLength,c.blockLength:c.blockLength:len, ...
        len-c.stationHalfLength,len]);
    b=zeros(numel(cuts)-1,4);
    for k=1:size(b,1)
        b(k,1:2)=cuts(k:k+1);
        % Passing loops/terminal approaches are abstracted as separate tracks.
        shared=tracks(e)==1 && cuts(k)>=c.stationHalfLength && cuts(k+1)<=len-c.stationHalfLength;
        b(k,3)=resource(sprintf('E%02d-B%03d+',e,k),'block');
        if shared, b(k,4)=b(k,3); else, b(k,4)=resource(sprintf('E%02d-B%03d-',e,k),'block'); end
    end
    net.blocks{e}=b;
    if tracks(e)==1, net.tokens(e)=resource(sprintf('Single-section-E%02d',e),'section'); end
end
% Each direction has its own abstract junction route; no invented flat crossing.
net.junctions=zeros(height(net.nodes),2);
for node=[6 9]
    for d=1:2, net.junctions(node,d)=resource(sprintf('J%02d-D%d',node,d),'junction'); end
end
net.distanceNote="Reference distances; not surveyed track geometry. See docs/REAL_DATA.md.";
    function id=resource(name,type)
        id=numel(net.resources)+1;
        net.resources(id)=struct('name',name,'type',type);
    end
end
