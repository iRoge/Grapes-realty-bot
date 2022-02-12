create table ads
(
	id int auto_increment,
	title varchar(255) null,
	rooms_qty int(8) null,
	ads_by_phone_qty int null,
	views_qty int null,
	no_realtor boolean null,
	cost int null,
	telephones text null,
	metro varchar(255) null,
	photo boolean null,
	city varchar(255) null,
	site_id smallint not null,
	constraint ads_pk
		primary key (id)
)
comment 'Таблица объявлений';

alter table ads
	add unique_id varchar(255) not null;

alter table ads
	add ad_added_date datetime default CURRENT_TIMESTAMP not null;

alter table ads
	add created_date datetime default CURRENT_TIMESTAMP not null;


