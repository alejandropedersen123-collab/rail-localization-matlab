function report=validate_network(outputDir)
% Reproduce full scenarios, unit checks, opposing traffic and step convergence.
if nargin<1, outputDir=fullfile(fileparts(mfilename('fullpath')),'results_network'); end
results=rail_network_demo(outputDir);
checks=network.selftest(results);
c=network.config(); n=network.infrastructure(c); t=network.timetable(n,c);
% Opposite Granada services meet near Loja; exercise clearing a passing loop.
pair=t([3 7]); pair(1).departure=6000; pair(2).departure=0;
meeting=network.simulate(n,pair,c,'nominal');
assert(meeting.audit.Completed==2 && meeting.audit.BlockConflicts==0);
assert(meeting.audit.AuthorityViolations==0 && meeting.audit.SpeedLimitViolations==0);
checks(end+1,:)={"Opposing Granada services complete through passing loops",true};
half=c; half.dt=.5;
refined=network.simulate(n,t,half,'nominal');
assert(refined.audit.Completed==8 && refined.audit.BlockConflicts==0);
assert(refined.audit.AuthorityViolations==0 && refined.audit.SpeedLimitViolations==0);
delta=abs(refined.summary.Arrival_s-results{1}.summary.Arrival_s);
assert(max(delta)<90,'Halving timestep changes an arrival by over 90 seconds.');
checks(end+1,:)={"Half-step convergence: maximum arrival difference under 90 s",true};
original=rail.selftest(rail.default_config());
writetable(checks,fullfile(outputDir,'checks.csv'));
writetable(original,fullfile(outputDir,'localization_checks.csv'));
convergence=table(string({t.id})',results{1}.summary.Arrival_s,refined.summary.Arrival_s,delta, ...
    'VariableNames',{'Train','Arrival_dt1_s','Arrival_dt05_s','Difference_s'});
writetable(convergence,fullfile(outputDir,'convergence.csv'));
writetable(struct2table(meeting.audit),fullfile(outputDir,'opposing_audit.csv'));
report=struct('checks',checks,'originalChecks',original,'convergence',convergence,'opposing',meeting.audit);
disp(checks); disp(convergence);
end
