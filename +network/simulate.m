function R=simulate(net,trains,c,scenario)
% Synchronous microscopic traffic over a reduced, source-documented network.
% Ground truth supplies ideal track occupancy and route odometry, explicitly.
N=numel(trains); owner=zeros(numel(net.resources),1);
s=zeros(1,N); v=s; state=s; next=ones(1,N); dwellUntil=inf(1,N);
arrival=nan(1,N); departure=nan(1,N); authority=s;
samples=floor(c.maxTime/c.sampleSeconds)+2; F=11;
trace=nan(samples,N,F); tt=zeros(samples,1); rows=0;
minGap=inf(1,N); maxSpeed=s; deniedSeconds=s;
blockConflicts=0; authorityViolations=0; limitViolations=0;
maxActive=0; minGapAll=Inf; stationRecords=cell(0,5);
for step=0:ceil(c.maxTime/c.dt)-1
    time=step*c.dt;
    outage=strcmp(scenario,'signal_outage') && time>=3600 && time<4200;
    % Allocate against a single shared reservation state before any train moves.
    for i=1:N
        if state(i)==3, continue; end
        if state(i)==0 && time<trains(i).departure, continue; end
        [authority(i),owner]=network.dispatch(trains(i),s(i),s(i)-trains(i).trainLength, ...
            i,owner,~outage,c);
        if state(i)==0 && authority(i)>c.reserve+1
            state(i)=1; departure(i)=time;
        end
    end
    for i=1:N
        if state(i)==0 || state(i)==3, continue; end
        tr=trains(i);
        if state(i)==2
            if time<dwellUntil(i), continue; end
            if next(i)>numel(tr.stops)
                state(i)=3; owner(owner==i)=0; continue;
            end
            state(i)=1;
        end
        stop=tr.stops(next(i));
        if stop-s(i)<.15 && v(i)<.15
            % Numerical docking adjustment <15 cm, only at a scheduled station.
            s(i)=stop; v(i)=0; state(i)=2;
            wait=c.dwell;
            if strcmp(scenario,'station_delay') && i==1 && next(i)==1, wait=wait+1200; end
            if next(i)==numel(tr.stops), arrival(i)=time; wait=c.terminalDwell; end
            stationRecords(end+1,:)={scenario,tr.id,char(tr.stopNames(next(i))),time,wait}; %#ok<AGROW>
            dwellUntil(i)=time+wait; next(i)=next(i)+1;
            continue;
        end
        [target,limit]=network.speed_target(tr,s(i),v(i),authority(i),stop,net,c);
        if authority(i)-s(i)<c.lookahead/2 && target<min(c.cruise,limit)-1
            deniedSeconds(i)=deniedSeconds(i)+c.dt;
        end
        a=max(-c.serviceBrake,min(c.acceleration,(target-v(i))/c.dt));
        [s(i),v(i)]=network.advance(s(i),v(i),a,c.dt);
        maxSpeed(i)=max(maxSpeed(i),v(i));
        authorityViolations=authorityViolations+(s(i)>authority(i)+1e-6);
        % Pointwise cap after the physical update, including a crossed boundary.
        [~,limitNow]=network.speed_target(tr,s(i),v(i),authority(i),stop,net,c);
        limitViolations=limitViolations+(v(i)>limitNow+.05);
    end
    active=state==1 | state==2; maxActive=max(maxActive,sum(active));
    % Independent occupancy audit from physical front/rear, not reserved lookahead.
    physical=zeros(numel(owner),1);
    for i=find(active)
        dem=trains(i).demands;
        used=dem(dem(:,2)<s(i)+1e-7 & dem(:,3)>s(i)-trains(i).trainLength+1e-7,1);
        for id=used'
            if physical(id)~=0 && physical(id)~=i, blockConflicts=blockConflicts+1; end
            physical(id)=i;
            authorityViolations=authorityViolations+(owner(id)~=i);
        end
    end
    gaps=inf(1,N); leaders=zeros(1,N); edges=zeros(1,N); positions=zeros(1,N);
    for i=find(active), [edges(i),positions(i)]=network.locate(trains(i),s(i),net); end
    % Rear-to-front clearance along the follower's directed route, not Euclidean.
    for i=find(active)
        for k=find(active)
            if i==k || trains(i).direction~=trains(k).direction, continue; end
            [e,rearX]=network.locate(trains(k),max(0,s(k)-trains(k).trainLength),net);
            j=find(trains(i).edges==e,1); if isempty(j), continue; end
            if trains(i).direction<0, rearX=net.edges.Length_km(e)*1000-rearX; end
            mappedRear=trains(i).offsets(j)+rearX;
            gap=mappedRear-s(i);
            if gap>=0 && gap<gaps(i), gaps(i)=gap; leaders(i)=k; end
        end
        minGap(i)=min(minGap(i),gaps(i));
    end
    minGapAll=min(minGapAll,min(gaps));
    if mod(step,round(c.sampleSeconds/c.dt))==0 || all(state==3) || time+c.dt>=c.maxTime
        rows=rows+1; tt(rows)=time+c.dt;
        for i=1:N
            [e,x]=network.locate(trains(i),s(i),net);
            trace(rows,i,:)=[s(i),v(i),state(i),authority(i),gaps(i),leaders(i), ...
                e,x,deniedSeconds(i),double(outage),next(i)-1];
        end
    end
    if all(state==3), break; end
end
minGap(~isfinite(minGap))=NaN;
R=struct('scenario',scenario,'time',tt(1:rows),'trace',trace(1:rows,:,:), ...
    'fields',{{'Progress_m','Speed_mps','State','Authority_m','LeaderGap_m', ...
    'LeaderID','EdgeID','EdgePosition_m','Restricted_s','SignalOutage','StopsCompleted'}}, ...
    'trains',trains,'config',c,'network',net,'stationRecords',{stationRecords});
R.summary=table(string({trains.id})',string({trains.label})', ...
    [trains.departure]',departure',arrival',(arrival-departure)'/60, ...
    maxSpeed'*3.6,minGap',deniedSeconds', ...
    'VariableNames',{'Train','Route','PlannedDeparture_s','Departure_s','Arrival_s', ...
    'Travel_min','MaxSpeed_kmh','MinimumLeaderGap_m','Restricted_s'});
R.audit=struct('Completed',sum(state==3),'MaximumActive',maxActive, ...
    'BlockConflicts',blockConflicts,'AuthorityViolations',authorityViolations, ...
    'SpeedLimitViolations',limitViolations,'MinimumLeaderGap_m',minGapAll, ...
    'EndTime_s',time+c.dt,'Scenario',scenario);
end
