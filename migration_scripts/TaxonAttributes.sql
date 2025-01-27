CREATE TABLE `TaxonAttributes` (
`taxon_id` int(11) NOT NULL PRIMARY KEY AUTO_INCREMENT COMMENT 'DkIndexNumber in FileMaker',
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime DEFAULT NULL,
  `diagnose` text DEFAULT NULL COMMENT 'diagnose in FileMaker',
  `forvekslingsmuligheder` text DEFAULT NULL,
  `beskrivelse` text DEFAULT NULL,
 `oekologi` text DEFAULT NULL COMMENT 'AtlasOekologi in FileMaker',
`bemaerkning` text DEFAULT NULL COMMENT 'atlasBem_rkning in FileMaker',
`foersteFundIDK` int(4) DEFAULT NULL,
`foersteReferenceForDK` int(4) DEFAULT NULL,
`PresentInDK` bit(1) NOT NULL DEFAULT 0,
 `DK_reference` text DEFAULT NULL,
 `MycoKeyIDDKWebLink` varchar(255) DEFAULT NULL,
 `internalNote` text DEFAULT NULL COMMENT 'note_internal in FileMaker',
  `DKnavn` varchar(255) DEFAULT NULL,
  `vernacular_name_DE` varchar(255) DEFAULT NULL,
  `vernacular_name_Fi` varchar(255) DEFAULT NULL,
  `vernacular_name_FR` varchar(255) DEFAULT NULL,
  `vernacular_name_GB` varchar(255) DEFAULT NULL,
  `vernacular_name_NL` varchar(255) DEFAULT NULL,
  `vernacular_name_NO` varchar(255) DEFAULT NULL,
  `vernacular_name_SE` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

INSERT INTO TaxonAttributes SELECT `_id` as `taxon_id`, `createdAt`, `updatedAt`, `diagnose`, `forvekslingsmuligheder`, `beskrivelse`,`oekologi` ,`bemaerkning` ,`foersteFundIDK` ,`foersteReferenceForDK` ,`PresentInDK` ,`DK_reference`,`MycoKeyIDDKWebLink`, `internalNote`,`DKnavn`, `vernacular_name_DE`,`vernacular_name_Fi` , `vernacular_name_FR` , `vernacular_name_GB`,  `vernacular_name_NL` ,  `vernacular_name_NO` , `vernacular_name_SE` FROM Taxon;
UPDATE TaxonBase set bog_Gyldendal_art_medtages=0 where bog_Gyldendal_art_medtages="";
UPDATE TaxonBase set bog_Gyldendal_art_medtages=1 where bog_Gyldendal_art_medtages="x";
UPDATE TaxonBase set Bogtekst_stor_art=0 where Bogtekst_stor_art="";
UPDATE TaxonBase set Bogtekst_stor_art=1 where Bogtekst_stor_art="x";
ALTER TABLE TaxonAttributes ADD COLUMN `spiselighedsrapport` VARCHAR (255), 
ADD COLUMN `BeskrivelseUK` TEXT,
 ADD COLUMN `bogtekst_faenologi_udbredelse` text DEFAULT NULL,
 ADD COLUMN `bogtekst_gyldendal` text DEFAULT NULL,
 ADD COLUMN `bog_Gyldendal_art_medtages` boolean NOT NULL DEFAULT 0,
 ADD COLUMN `Bogtekst_stor_art` boolean NOT NULL DEFAULT 0;
ALTER TABLE `TaxonAttributes` ADD `bog_gyldendal_korrekturlaest` TINYINT(1) NOT NULL DEFAULT '0' ;
UPDATE TaxonAttributes t, TaxonBase tb SET t.spiselighedsrapport = tb.spiselighedsrapport, t.BeskrivelseUK = tb.BeskrivelseUK, t.bogtekst_faenologi_udbredelse=tb.bogtekst_faenologi_udbredelse, t.bogtekst_gyldendal=tb.bogtekst_gyldendal,  t.bog_Gyldendal_art_medtages=tb.bog_Gyldendal_art_medtages, t.Bogtekst_stor_art=tb.Bogtekst_stor_art    WHERE tb.DkIndexNumber = t.taxon_id;
select count(*) from TaxonAttributes where spiselighedsrapport IS NOT NULL and spiselighedsrapport <> "";
select count(*) from TaxonAttributes where BeskrivelseUK IS NOT NULL and BeskrivelseUK <> "";