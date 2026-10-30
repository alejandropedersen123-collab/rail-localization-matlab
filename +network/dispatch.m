function [authority,owner]=dispatch(tr,s,rear,trainID,owner,canExtend,c)
% Persistent exclusive reservations. Never revoke a grant in front of a train.
dem=tr.demands;
release=dem(:,3)<rear-c.releaseMargin;
ids=dem(release,1); ids=ids(owner(ids)==trainID); owner(ids)=0;
needed=find(dem(:,3)>=rear & dem(:,2)<=s+c.lookahead);
authority=tr.length+500;
for j=needed'
    id=dem(j,1);
    if owner(id)==trainID, continue; end
    if owner(id)==0 && canExtend
        owner(id)=trainID;
    else
        authority=min(authority,dem(j,2));
        break;
    end
end
% Do not imply authority beyond the first unreserved resource outside lookahead.
future=find(dem(:,2)>s+c.lookahead,1);
if ~isempty(future), authority=min(authority,dem(future,2)); end
end
