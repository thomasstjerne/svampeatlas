UPDATE Taxon t, Taxon ta, Taxon taa SET t.accepted_id = taa._id where t.accepted_id <> t._id AND t.accepted_id =ta._id AND ta._id <> ta.accepted_id AND ta.accepted_id =taa._id and taa._id = taa.accepted_id;